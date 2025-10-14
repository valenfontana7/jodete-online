import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import SuitIcon from "./SuitIcon";

// Metadatos de los palos de la baraja española
const SUIT_META = [
  {
    id: "oros",
    label: "Oros",
    tone: "suit-gold",
  },
  {
    id: "copas",
    label: "Copas",
    tone: "suit-red",
  },
  {
    id: "espadas",
    label: "Espadas",
    tone: "suit-blue",
  },
  {
    id: "bastos",
    label: "Bastos",
    tone: "suit-green",
  },
];

const VALUE_NAMES = {
  1: "As",
  2: "Dos",
  3: "Tres",
  4: "Cuatro",
  5: "Cinco",
  6: "Seis",
  7: "Siete",
  10: "Diez",
  11: "Once",
  12: "Doce",
};

const VALUE_SIGNS = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  10: "10",
  11: "11",
  12: "12",
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function hashString(input) {
  const str = String(input ?? "");
  let hash = 0;
  for (let index = 0; index < str.length; index += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getCardTilt(id) {
  const hash = hashString(`tilt:${id}`);
  const offset = (hash % 7) - 3;
  return offset * 0.6;
}

function getCardGrainAngle(id) {
  const hash = hashString(`grain:${id}`);
  return hash % 360;
}

const SUIT_INDEX = SUIT_META.reduce((acc, suit, index) => {
  acc[suit.id] = index;
  return acc;
}, {});

const getInitialName = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem("playerName") ?? "";
};

const getInitialToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem("playerToken");
};

const getInitialRoomId = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem("lastRoomId");
};

const computeSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl) return envUrl;
  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }
  const { protocol, hostname, port } = window.location;
  if (port && port !== "3001") {
    return `${protocol}//${hostname}:3001`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
};

const SOCKET_URL = computeSocketUrl();

const ROOM_PHASE_LABELS = {
  lobby: "Esperando",
  playing: "En juego",
  finished: "Finalizada",
};

function describeRoomPhase(phase) {
  return ROOM_PHASE_LABELS[phase] ?? "Desconocida";
}

const FLASH_DURATIONS = {
  turn: 1200,
  victory: 1600,
  defeat: 1600,
};

function describeCard(card) {
  if (!card) return "";
  const suit = SUIT_META.find((item) => item.id === card.suit);
  const value = VALUE_NAMES[card.value] ?? card.value;
  return `${value} de ${suit?.label ?? card.suit}`;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function App() {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [nameInput, setNameInput] = useState(getInitialName);
  const [playerToken, setPlayerToken] = useState(getInitialToken);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState(null);
  const [cardsPerPlayer, setCardsPerPlayer] = useState(null);
  const [suitPromptCardId, setSuitPromptCardId] = useState(null);
  const [lastActionKey, setLastActionKey] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [pendingJoin, setPendingJoin] = useState(false);
  const [storedRoomId, setStoredRoomId] = useState(getInitialRoomId);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(false);
  const autoJoinAttemptedRef = useRef(false);
  const [flashVariant, setFlashVariant] = useState(null);
  const flashTimeoutRef = useRef(null);
  const prevIsMyTurnRef = useRef(false);
  const prevPhaseRef = useRef(null);
  const prevWinnerRef = useRef(null);
  const [actionOverlay, setActionOverlay] = useState(null);
  const overlayTimeoutRef = useRef(null);
  const prevLastActionRef = useRef(null);
  const joinableRooms = useMemo(
    () => rooms.filter((room) => room.phase !== "finished"),
    [rooms]
  );

  useEffect(() => {
    const instance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    setSocket(instance);

    instance.on("connect", () => {
      setSocketConnected(true);
      console.log("Conectado al servidor");

      // Reintentar reconexión automática si había un token y roomId guardados
      const savedToken =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("playerToken")
          : null;
      const savedRoomId =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("lastRoomId")
          : null;

      if (savedToken && savedRoomId) {
        console.log("Intentando reconectar a la sala anterior...");
        autoJoinAttemptedRef.current = false;
      }
    });

    instance.on("connect_error", (error) => {
      console.error("Error de conexión:", error);
    });

    instance.on("disconnect", (reason) => {
      console.log("Desconectado:", reason);
      setSocketConnected(false);
      setPendingJoin(false);
      setRoomsLoaded(false);
      setRooms([]);
      setPendingLeave(false);
      // NO resetear hasJoined aquí - esperar a que el servidor confirme el estado
      // Esto previene que el cliente intente acciones antes de reconectarse
    });
    instance.on("rooms", (overview) => {
      setRooms(overview);
      setRoomsLoaded(true);
      setStoredRoomId((prev) => {
        if (!prev) {
          return prev;
        }
        const exists = overview.some(
          (room) => room.id === prev && room.phase !== "finished"
        );
        if (!exists) {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem("lastRoomId");
          }
          autoJoinAttemptedRef.current = false;
          return null;
        }
        return prev;
      });
    });
    instance.on("state", (state) => {
      setGameState(state);
      setHasJoined(Boolean(state?.me));
      setPendingJoin(false);
      if (state?.roomId && typeof window !== "undefined") {
        window.sessionStorage.setItem("lastRoomId", state.roomId);
      }
      if (state?.roomId) {
        setStoredRoomId(state.roomId);
      }
      if (state?.me?.token) {
        setPlayerToken((prev) => {
          if (prev === state.me.token) {
            return prev;
          }
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("playerToken", state.me.token);
          }
          return state.me.token;
        });
      }
    });
    instance.on("actionError", (message) => {
      setError(message);
      setPendingJoin(false);
      setPendingLeave(false);
      if (
        typeof message === "string" &&
        message.toLowerCase().includes("ya no existe")
      ) {
        setStoredRoomId((prev) => {
          if (!prev) {
            return prev;
          }
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem("lastRoomId");
          }
          autoJoinAttemptedRef.current = false;
          return null;
        });
      }
    });
    instance.on("joinedRoom", ({ roomId }) => {
      setHasJoined(true);
      setPendingJoin(false);
      setPendingLeave(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("lastRoomId", roomId);
      }
      setStoredRoomId(roomId);
    });
    instance.on("leftRoom", () => {
      setGameState(null);
      setHasJoined(false);
      setPendingJoin(false);
      setPendingLeave(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("lastRoomId");
      }
      autoJoinAttemptedRef.current = false;
      setStoredRoomId(null);
    });
    instance.on("connect_error", (err) => {
      console.error("Error de conexión con el servidor", err);
      setError(
        "No se pudo conectar con el servidor. Verificá que el backend esté activo."
      );
    });

    return () => {
      instance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!roomsLoaded || !joinableRooms.length) {
      setSelectedRoomId(null);
      return;
    }
    setSelectedRoomId((prev) => {
      if (prev && joinableRooms.some((room) => room.id === prev)) {
        return prev;
      }
      return joinableRooms[0].id;
    });
  }, [roomsLoaded, joinableRooms]);

  useEffect(() => {
    if (
      !socket ||
      !socketConnected ||
      !playerToken ||
      !storedRoomId ||
      !roomsLoaded ||
      autoJoinAttemptedRef.current
    ) {
      return;
    }
    const targetRoomExists = joinableRooms.some(
      (room) => room.id === storedRoomId
    );
    if (!targetRoomExists) {
      return;
    }
    autoJoinAttemptedRef.current = true;
    setPendingJoin(true);
    const fallbackName = (() => {
      const trimmed = nameInput.trim();
      if (trimmed) return trimmed;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("playerName");
        if (stored?.trim()) {
          return stored.trim();
        }
      }
      return "Jugador";
    })();
    socket.emit("joinRoom", {
      roomId: storedRoomId,
      token: playerToken,
      name: fallbackName,
    });
  }, [
    socket,
    socketConnected,
    playerToken,
    storedRoomId,
    roomsLoaded,
    joinableRooms,
    nameInput,
  ]);

  useEffect(() => {
    if (!gameState?.cardsPerPlayerOptions?.length) {
      return;
    }
    if (
      !cardsPerPlayer ||
      !gameState.cardsPerPlayerOptions.includes(cardsPerPlayer)
    ) {
      setCardsPerPlayer(gameState.cardsPerPlayerOptions[0]);
    }
  }, [gameState, cardsPerPlayer]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    const rawAction = gameState?.lastAction;
    if (typeof rawAction !== "string") {
      return;
    }

    const message = rawAction.trim();
    if (!message) {
      setLastActionKey((prev) => prev + 1);
      return;
    }

    if (prevLastActionRef.current === message) {
      return;
    }

    prevLastActionRef.current = message;
    setLastActionKey((prev) => prev + 1);

    const myName = gameState?.me?.name;
    let isMyAction = false;
    if (typeof myName === "string" && myName.trim()) {
      try {
        const pattern = new RegExp(`\\b${escapeRegExp(myName.trim())}\\b`, "i");
        isMyAction = pattern.test(message);
      } catch (error) {
        console.warn("No se pudo analizar el movimiento recibido", error);
        isMyAction = false;
      }
    }

    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }

    if (isMyAction) {
      setActionOverlay(null);
      return;
    }

    setActionOverlay({
      text: message,
      timestamp: Date.now(),
    });
    overlayTimeoutRef.current = setTimeout(() => {
      setActionOverlay(null);
      overlayTimeoutRef.current = null;
    }, 2600);
  }, [gameState?.lastAction, gameState?.me?.name]);

  useEffect(
    () => () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    },
    []
  );

  const me = gameState?.me ?? null;

  const isHost = useMemo(() => {
    if (!me || !gameState?.players) return false;
    return gameState.players.some(
      (player) => player.id === me.id && player.isHost
    );
  }, [gameState, me]);

  const isMyTurn = useMemo(() => {
    if (!me || !gameState?.players) return false;
    return gameState.players.some(
      (player) => player.id === me.id && player.isCurrent
    );
  }, [gameState, me]);

  const playableCards = useMemo(() => {
    return new Set(me?.playableCardIds ?? []);
  }, [me]);

  const sortedHand = useMemo(() => {
    if (!me?.hand) return [];
    return [...me.hand].sort((a, b) => {
      const suitDiff = (SUIT_INDEX[a.suit] ?? 0) - (SUIT_INDEX[b.suit] ?? 0);
      if (suitDiff !== 0) return suitDiff;
      return a.value - b.value;
    });
  }, [me]);

  const jodeteTargets = useMemo(() => {
    if (!gameState?.players) return [];
    return gameState.players.filter(
      (player) =>
        player.id !== me?.id &&
        player.cardCount === 1 &&
        !player.declaredLastCard &&
        player.connected
    );
  }, [gameState, me]);

  const phaseLabel = useMemo(() => {
    switch (gameState?.phase) {
      case "lobby":
        return "En sala de espera";
      case "playing":
        return "En juego";
      case "finished":
        return "Partida finalizada";
      default:
        if (!socketConnected) {
          return "Conectando...";
        }
        if (!hasJoined) {
          return joinableRooms.length
            ? "Salas disponibles"
            : "Sin salas activas";
        }
        return "Conectando...";
    }
  }, [gameState, socketConnected, hasJoined, joinableRooms.length]);

  const triggerFlash = useCallback((variant) => {
    if (!variant) return;
    const duration = FLASH_DURATIONS[variant] ?? 1200;
    setFlashVariant(variant);
    if (typeof window === "undefined") {
      return;
    }
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashVariant(null);
      flashTimeoutRef.current = null;
    }, duration);
  }, []);

  const handleJoinSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (!socket) {
        setError("No hay conexión con el servidor");
        return;
      }
      const trimmed = nameInput.trim();
      if (!trimmed) {
        setError("Elegí un nombre para entrar a la mesa");
        return;
      }
      setError(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("playerName", trimmed);
        window.sessionStorage.removeItem("playerToken");
        window.sessionStorage.removeItem("lastRoomId");
      }
      setPlayerToken(null);
      setStoredRoomId(null);
      autoJoinAttemptedRef.current = false;
      setPendingJoin(true);

      // Si no hay salas disponibles O no seleccionaste ninguna, crear una nueva
      if (!joinableRooms.length || !selectedRoomId) {
        socket.emit("createRoom", {
          roomName: `Mesa de ${trimmed}`,
          playerName: trimmed,
          token: null,
        });
        return;
      }

      // Si seleccionaste una sala, verificar que exista y unirse
      const selectedExists = joinableRooms.some(
        (room) => room.id === selectedRoomId
      );
      if (!selectedExists) {
        setError("La sala seleccionada ya no está disponible para unirse.");
        setSelectedRoomId(null);
        setPendingJoin(false);
        return;
      }

      socket.emit("joinRoom", {
        roomId: selectedRoomId,
        name: trimmed,
        token: null,
      });
    },
    [nameInput, socket, joinableRooms, selectedRoomId]
  );

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(flashTimeoutRef.current);
      }
      setFlashVariant(null);
      flashTimeoutRef.current = null;
    };
  }, []);

  useEffect(() => {
    const wasMyTurn = prevIsMyTurnRef.current;
    if (isMyTurn && !wasMyTurn && gameState?.phase === "playing") {
      triggerFlash("turn");
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, gameState?.phase, triggerFlash]);

  useEffect(() => {
    const currentPhase = gameState?.phase ?? null;
    const currentWinner = gameState?.winnerId ?? null;
    const prevPhase = prevPhaseRef.current;
    const prevWinner = prevWinnerRef.current;

    if (
      currentPhase === "finished" &&
      currentWinner &&
      (prevPhase !== "finished" || prevWinner !== currentWinner)
    ) {
      if (currentWinner === me?.id) {
        triggerFlash("victory");
      } else if (me) {
        triggerFlash("defeat");
      }
    }

    prevPhaseRef.current = currentPhase;
    prevWinnerRef.current = currentWinner;
  }, [gameState?.phase, gameState?.winnerId, me?.id, triggerFlash, me]);

  const handleLeaveRoom = useCallback(() => {
    if (!socket) {
      return;
    }
    setPendingLeave(true);
    setPendingJoin(false);
    setGameState(null);
    setHasJoined(false);
    setStoredRoomId(null);
    setPlayerToken(null);
    autoJoinAttemptedRef.current = false;
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("lastRoomId");
      window.sessionStorage.removeItem("playerToken");
    }
    socket.emit("leaveRoom");
  }, [socket]);

  const currentRoomSummary = useMemo(() => {
    if (!gameState?.roomId) {
      return null;
    }
    return rooms.find((room) => room.id === gameState.roomId) ?? null;
  }, [rooms, gameState?.roomId]);

  const displayPlayers = useMemo(() => {
    const byId = new Map();

    const isCurrentFromState = (playerId) =>
      Boolean(
        gameState?.players?.some(
          (player) => player.id === playerId && player.isCurrent
        )
      );

    const isHostFromState = (playerId) =>
      Boolean(
        gameState?.players?.some(
          (player) => player.id === playerId && player.isHost
        )
      );

    const isHostFromSummary = (summaryPlayer) =>
      Boolean(
        currentRoomSummary?.hostName &&
          summaryPlayer?.name &&
          summaryPlayer.name === currentRoomSummary.hostName
      );

    if (Array.isArray(gameState?.players)) {
      gameState.players.forEach((player) => {
        byId.set(player.id, {
          ...player,
          isSummaryOnly: false,
        });
      });
    }

    if (gameState?.me) {
      const existing = byId.get(gameState.me.id);
      const enhanced = {
        id: gameState.me.id,
        name: gameState.me.name,
        cardCount: existing?.cardCount ?? gameState.me.hand?.length ?? 0,
        declaredLastCard:
          existing?.declaredLastCard ?? Boolean(gameState.me.declaredLastCard),
        connected: true,
        isCurrent: existing?.isCurrent ?? isCurrentFromState(gameState.me.id),
        isHost:
          existing?.isHost ??
          (isHostFromState(gameState.me.id) ||
            (currentRoomSummary?.hostName
              ? currentRoomSummary.hostName === gameState.me.name
              : true)),
        isSummaryOnly: false,
      };
      byId.set(gameState.me.id, enhanced);
    }

    if (currentRoomSummary?.players?.length) {
      currentRoomSummary.players.forEach((summaryPlayer) => {
        const existing = byId.get(summaryPlayer.id);
        if (existing) {
          existing.connected = summaryPlayer.connected;
          if (!existing.name && summaryPlayer.name) {
            existing.name = summaryPlayer.name;
          }
        } else {
          byId.set(summaryPlayer.id, {
            id: summaryPlayer.id,
            name: summaryPlayer.name || "Jugador",
            cardCount: null,
            declaredLastCard: false,
            connected: summaryPlayer.connected,
            isCurrent: false,
            isHost: isHostFromSummary(summaryPlayer),
            isSummaryOnly: true,
          });
        }
      });
    }

    return Array.from(byId.values());
  }, [gameState?.players, gameState?.me, currentRoomSummary]);

  const handleStart = useCallback(() => {
    if (!socket || !socketConnected || !hasJoined || !gameState?.me) {
      console.warn("No se puede iniciar: no estás en una sala o desconectado", {
        socket: !!socket,
        socketConnected,
        hasJoined,
        hasGameState: !!gameState?.me,
      });
      return;
    }
    const fallbackSize =
      cardsPerPlayer ?? gameState?.cardsPerPlayerOptions?.[0] ?? null;
    if (fallbackSize == null) return;
    const normalizedSize = Number(fallbackSize);
    if (!Number.isFinite(normalizedSize) || normalizedSize <= 0) {
      return;
    }
    setCardsPerPlayer(normalizedSize);
    socket.emit("start", { cardsPerPlayer: normalizedSize });
  }, [
    socket,
    socketConnected,
    hasJoined,
    gameState?.me,
    cardsPerPlayer,
    gameState?.cardsPerPlayerOptions,
  ]);

  const handleDraw = useCallback(() => {
    if (!socket || !socketConnected || !hasJoined || !gameState?.me) {
      console.warn("No se puede robar: no estás en una sala o desconectado");
      return;
    }
    socket.emit("drawCard");
  }, [socket, socketConnected, hasJoined, gameState?.me]);

  const handleDeclareLastCard = useCallback(() => {
    if (!socket || !socketConnected || !hasJoined || !gameState?.me) {
      console.warn("No se puede declarar: no estás en una sala o desconectado");
      return;
    }
    socket.emit("declareLastCard");
  }, [socket, socketConnected, hasJoined, gameState?.me]);

  const handleCallJodete = useCallback(
    (targetId) => {
      if (!socket || !socketConnected || !hasJoined || !gameState?.me) {
        console.warn(
          "No se puede decir jodete: no estás en una sala o desconectado"
        );
        return;
      }
      socket.emit("callJodete", { targetId });
    },
    [socket, socketConnected, hasJoined, gameState?.me]
  );

  const handleReset = useCallback(() => {
    if (!socket || !socketConnected || !hasJoined || !gameState?.me) {
      console.warn(
        "No se puede reiniciar: no estás en una sala o desconectado"
      );
      return;
    }
    socket.emit("reset");
  }, [socket, socketConnected, hasJoined, gameState?.me]);

  const handlePlayCard = useCallback(
    (card) => {
      if (
        !socket ||
        !socketConnected ||
        !card ||
        !hasJoined ||
        !gameState?.me
      ) {
        console.warn(
          "No se puede jugar carta: no estás en una sala o desconectado"
        );
        return;
      }
      if (!playableCards.has(card.id) || !isMyTurn) {
        return;
      }
      if (card.value === 10) {
        setSuitPromptCardId(card.id);
        return;
      }
      socket.emit("playCard", { cardId: card.id });
    },
    [socket, socketConnected, hasJoined, gameState?.me, isMyTurn, playableCards]
  );

  const confirmSuitSelection = useCallback(
    (suit) => {
      if (
        !socket ||
        !socketConnected ||
        !suitPromptCardId ||
        !hasJoined ||
        !gameState?.me
      ) {
        console.warn(
          "No se puede confirmar palo: no estás en una sala o desconectado"
        );
        return;
      }
      socket.emit("playCard", { cardId: suitPromptCardId, chosenSuit: suit });
      setSuitPromptCardId(null);
    },
    [socket, socketConnected, hasJoined, gameState?.me, suitPromptCardId]
  );

  const cancelSuitSelection = useCallback(() => {
    setSuitPromptCardId(null);
  }, []);

  const canStart =
    socketConnected &&
    hasJoined &&
    isHost &&
    (gameState?.players?.filter((player) => player.connected).length ?? 0) >= 2;
  const canDraw =
    socketConnected && hasJoined && gameState?.phase === "playing" && isMyTurn;
  const canDeclareLastCard =
    socketConnected &&
    hasJoined &&
    me?.hand?.length === 1 &&
    !me.declaredLastCard;
  const flashClassName = flashVariant
    ? `screen-flash screen-flash--${flashVariant}`
    : "screen-flash";

  return (
    <div className="app-shell">
      <div className={flashClassName} aria-hidden="true" />
      <header className="app-header">
        <div className="branding">
          <h1>Jodete 🫵🏼</h1>
          <p>Baraja española, partidas en tiempo real.</p>
        </div>
        <div className="status-badges">
          <div className="status-indicator">
            <span
              className={
                socketConnected ? "dot dot--online" : "dot dot--offline"
              }
            />
            <span>
              {socketConnected
                ? "Conectado"
                : socket
                ? "Reconectando..."
                : "Desconectado"}
            </span>
          </div>
          <span className="phase-badge">{phaseLabel}</span>
        </div>
      </header>

      {!hasJoined && (
        <section
          className="panel join-panel"
          style={{ "--panel-delay": "40ms" }}
        >
          <h2>Sumate a la mesa</h2>
          <p className="panel-subtitle">
            Ingresá tu nombre y elegí una sala o creá una nueva.
          </p>
          <form className="join-form" onSubmit={handleJoinSubmit}>
            <input
              className="text-input"
              placeholder="Tu nombre o apodo"
              maxLength={32}
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              disabled={
                !socketConnected || pendingJoin || pendingLeave || !roomsLoaded
              }
            />
            <button
              type="submit"
              className="primary"
              disabled={
                !socketConnected || pendingJoin || pendingLeave || !roomsLoaded
              }
            >
              {pendingJoin
                ? "Conectando..."
                : !roomsLoaded
                ? "Sincronizando..."
                : selectedRoomId
                ? "Unirme a sala"
                : "Crear sala nueva"}
            </button>
          </form>
          {!roomsLoaded ? (
            <p className="hint">Sincronizando salas disponibles...</p>
          ) : rooms.length > 0 ? (
            <div className="rooms-panel">
              <p className="hint">
                {joinableRooms.length
                  ? selectedRoomId
                    ? "Seleccionaste una sala. Presioná 'Unirme' o elegí 'Crear sala nueva' deseleccionando."
                    : "Salas disponibles (hacé click para unirte) o creá una nueva:"
                  : "Solo hay partidas finalizadas. Creá una sala nueva."}
              </p>
              <div className="rooms-list">
                {rooms.map((room) => {
                  const isSelected = selectedRoomId === room.id;
                  const phaseKey = room.phase ?? "lobby";
                  const isJoinable = room.phase !== "finished";
                  const cardClass = `room-card${
                    isSelected ? " room-card--active" : ""
                  }${isJoinable ? "" : " room-card--disabled"}`;
                  return (
                    <button
                      type="button"
                      key={room.id}
                      className={cardClass}
                      onClick={() =>
                        setSelectedRoomId(isSelected ? null : room.id)
                      }
                      disabled={!isJoinable || pendingJoin || pendingLeave}
                    >
                      <div className="room-card__info">
                        <span className="room-name">{room.name}</span>
                        {room.hostName && (
                          <span className="room-host">👑 {room.hostName}</span>
                        )}
                        <div className="room-card__people">
                          {room.players.map((player) => (
                            <span
                              key={player.id}
                              className={`room-player-chip${
                                player.connected
                                  ? ""
                                  : " room-player-chip--away"
                              }`}
                            >
                              {player.name}
                            </span>
                          ))}
                          {!room.players.length && (
                            <span className="room-player-chip room-player-chip--empty">
                              Sala vacía
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="room-card__meta">
                        <span className={`room-phase room-phase--${phaseKey}`}>
                          {describeRoomPhase(phaseKey)}
                        </span>
                        <span className="room-card__players">
                          👥 {room.playerCount}
                        </span>
                        {room.phase === "finished" && (
                          <span className="room-note">Finalizada</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="hint">
              No hay salas activas. Se creará una nueva sala cuando te unas.
            </p>
          )}
          {error && <p className="error-banner">{error}</p>}
          {joinableRooms.length > 0 && (
            <p className="hint hint--tip">
              💡 Tip: Hacé click en una sala para unirte, o dejala sin
              seleccionar para crear una nueva.
            </p>
          )}
          <p className="hint">
            Compartí la URL de esta página para invitar a otros jugadores.
          </p>
        </section>
      )}

      {hasJoined && (
        <div className="layout-grid">
          <section
            className="panel players-panel"
            style={{ "--panel-delay": "0ms" }}
          >
            <header className="panel-header">
              <div className="panel-heading">
                <h2>Jugadores</h2>
                {gameState?.roomName && (
                  <span className="panel-caption">
                    Sala: <br />
                    {gameState.roomName}
                  </span>
                )}
              </div>
              <div className="panel-controls">
                {isHost && <span className="badge">Anfitrión</span>}
                <button
                  type="button"
                  className="ghost small leave-button"
                  onClick={handleLeaveRoom}
                  disabled={pendingLeave}
                >
                  {pendingLeave ? "Saliendo..." : "Salir de la sala"}
                </button>
              </div>
            </header>
            <ul className="players-list">
              {displayPlayers.length ? (
                displayPlayers.map((player, index) => (
                  <li
                    key={player.id}
                    className={`player-row${
                      player.isCurrent ? " player-row--turn" : ""
                    }`}
                    style={{ "--item-delay": `${index * 60}ms` }}
                  >
                    <div className="player-main">
                      <span className="player-name">{player.name}</span>
                      {player.isHost && <span className="tag">👑</span>}
                      {!player.connected && (
                        <span className="tag tag--disconnected">
                          Desconectado
                        </span>
                      )}
                      {player.isSummaryOnly && (
                        <span className="tag tag--summary">Sincronizando</span>
                      )}
                    </div>
                    <div className="player-meta">
                      <span className="counter" title="Cartas en mano">
                        🃏 {player.cardCount ?? "—"}
                      </span>
                      {player.declaredLastCard && (
                        <span className="tag tag--safe">¡Avisó!</span>
                      )}
                      {player.id !== me?.id &&
                        player.cardCount === 1 &&
                        !player.declaredLastCard && (
                          <button
                            type="button"
                            className="ghost small"
                            onClick={() => handleCallJodete(player.id)}
                            disabled={gameState?.phase !== "playing"}
                          >
                            ¡Jodete!
                          </button>
                        )}
                    </div>
                  </li>
                ))
              ) : (
                <li className="player-placeholder">
                  Aún no hay jugadores en esta sala.
                </li>
              )}
            </ul>

            {gameState?.phase === "lobby" && (
              <div className="lobby-controls">
                <label className="control">
                  <span>Cartas por jugador</span>
                  <select
                    value={cardsPerPlayer ?? ""}
                    onChange={(event) =>
                      setCardsPerPlayer(Number(event.target.value))
                    }
                    disabled={!isHost}
                  >
                    {(gameState?.cardsPerPlayerOptions ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="primary"
                  onClick={handleStart}
                  disabled={!canStart}
                >
                  Comenzar partida
                </button>
              </div>
            )}

            {gameState?.phase === "finished" && isHost && (
              <button type="button" className="primary" onClick={handleReset}>
                Nueva partida
              </button>
            )}
          </section>

          <section
            className="panel board-panel"
            style={{ "--panel-delay": "120ms" }}
          >
            <header className="panel-header">
              <h2>Tablero</h2>
              {gameState?.lastAction && (
                <span key={lastActionKey} className="last-action">
                  {gameState.lastAction}
                </span>
              )}
            </header>

            <div className="board-state">
              <div className="board-info">
                <div>
                  <span className="label">Palo actual</span>
                  <span className="value">
                    {gameState?.currentSuit
                      ? SUIT_META.find(
                          (item) => item.id === gameState.currentSuit
                        )?.label ?? gameState.currentSuit
                      : "Libre"}
                  </span>
                </div>
                <div>
                  <span className="label">Sentido</span>
                  <span className="value">
                    {gameState?.direction === -1 ? "↺ Reversa" : "↻ Normal"}
                  </span>
                </div>
                <div>
                  <span className="label">Mazo</span>
                  <span className="value">{gameState?.deckCount ?? 0}</span>
                </div>
                <div>
                  <span className="label">Descartes</span>
                  <span className="value">{gameState?.discardCount ?? 0}</span>
                </div>
                {gameState?.pendingDraw ? (
                  <div className="pending">
                    {`Próximo roba ${gameState.pendingDraw} carta(s)`}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="primary"
                  onClick={handleDraw}
                  disabled={!canDraw}
                >
                  Robar carta
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={handleDeclareLastCard}
                  disabled={!canDeclareLastCard}
                >
                  Última carta
                </button>
                <div className="jodete-targets">
                  {jodeteTargets.map((player, index) => (
                    <button
                      key={player.id}
                      type="button"
                      className="ghost"
                      onClick={() => handleCallJodete(player.id)}
                      disabled={gameState?.phase !== "playing"}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      ¡Jodete {player.name}!
                    </button>
                  ))}
                </div>
              </div>
              <div className="top-card">
                <span className="label">Carta superior</span>
                {gameState?.topCard ? (
                  (() => {
                    const suit = SUIT_META.find(
                      (item) => item.id === gameState.topCard.suit
                    );
                    const valueName =
                      VALUE_NAMES[gameState.topCard.value] ??
                      gameState.topCard.value;
                    const valueSign =
                      VALUE_SIGNS[gameState.topCard.value] ??
                      gameState.topCard.value;
                    const cardId = gameState.topCard.id ?? "top-card";
                    const cardStyle = {
                      "--card-tilt": `${getCardTilt(cardId)}deg`,
                      "--grain-angle": `${getCardGrainAngle(cardId)}deg`,
                    };
                    return (
                      <div
                        className={`card-tile card-tile--large ${
                          suit?.tone ?? ""
                        }`}
                        aria-label={describeCard(gameState.topCard)}
                        style={cardStyle}
                      >
                        <div className="card-face card-face--large">
                          <span className="card-corner card-corner--top">
                            <span className="card-corner-value">
                              {valueSign}
                            </span>
                            <span className="card-corner-suit">
                              <SuitIcon suit={suit?.id} />
                            </span>
                          </span>
                          <div className="card-illustration">
                            <div
                              className="card-ornament-row card-ornament-row--top"
                              aria-hidden="true"
                            >
                              <span className="card-ornament card-ornament--dot">
                                ✶
                              </span>
                              <span className="card-ornament card-ornament--suit">
                                <SuitIcon suit={suit?.id} />
                              </span>
                              <span className="card-ornament card-ornament--dot">
                                ✶
                              </span>
                            </div>
                            <span className="card-icon">
                              <SuitIcon suit={suit?.id} />
                            </span>
                            <div
                              className="card-ornament-row card-ornament-row--bottom"
                              aria-hidden="true"
                            >
                              <span className="card-ornament card-ornament--dot">
                                ✶
                              </span>
                              <span className="card-ornament card-ornament--suit">
                                <SuitIcon suit={suit?.id} />
                              </span>
                              <span className="card-ornament card-ornament--dot">
                                ✶
                              </span>
                            </div>
                            <span className="card-ribbon">{valueName}</span>
                          </div>
                          <span className="card-corner card-corner--bottom">
                            <span className="card-corner-value">
                              {valueSign}
                            </span>
                            <span className="card-corner-suit">
                              <SuitIcon suit={suit?.id} />
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="card-placeholder">Mazo preparado</div>
                )}
              </div>
            </div>

            <section className="hand-section">
              <header className="panel-header">
                <h3>Tu mano ({me?.hand?.length ?? 0})</h3>
                {isMyTurn ? (
                  <span className="tag tag--turn">Tu turno</span>
                ) : (
                  <span className="tag">Esperando</span>
                )}
              </header>
              <div className="hand-grid">
                {sortedHand.map((card, index) => {
                  const suit = SUIT_META.find((item) => item.id === card.suit);
                  const playable = playableCards.has(card.id) && isMyTurn;
                  const valueName = VALUE_NAMES[card.value] ?? card.value;
                  const valueSign = VALUE_SIGNS[card.value] ?? card.value;
                  const tileStyle = {
                    "--item-delay": `${index * 40}ms`,
                    "--card-tilt": `${getCardTilt(card.id)}deg`,
                    "--grain-angle": `${getCardGrainAngle(card.id)}deg`,
                  };
                  return (
                    <button
                      type="button"
                      key={card.id}
                      className={`card-tile ${suit?.tone ?? ""} ${
                        playable ? "card-tile--playable" : "card-tile--blocked"
                      }`}
                      onClick={() => handlePlayCard(card)}
                      disabled={!playable}
                      title={describeCard(card)}
                      aria-label={describeCard(card)}
                      style={tileStyle}
                    >
                      <div className="card-face">
                        <span className="card-corner card-corner--top">
                          <span className="card-corner-value">{valueSign}</span>
                          <span className="card-corner-suit">
                            <SuitIcon suit={suit?.id} />
                          </span>
                        </span>
                        <div className="card-illustration">
                          <div
                            className="card-ornament-row card-ornament-row--top"
                            aria-hidden="true"
                          >
                            <span className="card-ornament card-ornament--dot">
                              ✶
                            </span>
                            <span className="card-ornament card-ornament--suit">
                              <SuitIcon suit={suit?.id} />
                            </span>
                            <span className="card-ornament card-ornament--dot">
                              ✶
                            </span>
                          </div>
                          <span className="card-icon">
                            <SuitIcon suit={suit?.id} />
                          </span>
                          <div
                            className="card-ornament-row card-ornament-row--bottom"
                            aria-hidden="true"
                          >
                            <span className="card-ornament card-ornament--dot">
                              ✶
                            </span>
                            <span className="card-ornament card-ornament--suit">
                              <SuitIcon suit={suit?.id} />
                            </span>
                            <span className="card-ornament card-ornament--dot">
                              ✶
                            </span>
                          </div>
                          <span className="card-ribbon">{valueName}</span>
                        </div>
                        <span className="card-corner card-corner--bottom">
                          <span className="card-corner-value">{valueSign}</span>
                          <span className="card-corner-suit">
                            <SuitIcon suit={suit?.id} />
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
                {!sortedHand.length && (
                  <p className="empty-hint">Sin cartas en mano.</p>
                )}
              </div>
            </section>
          </section>

          <section
            className="panel log-panel"
            style={{ "--panel-delay": "200ms" }}
          >
            <header className="panel-header">
              <h2>Historial</h2>
            </header>
            <ul className="log-list">
              {gameState?.messages
                ?.slice()
                .reverse()
                .map((message) => (
                  <li key={message.id}>
                    <span className="log-time">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    <span className="log-text">{message.text}</span>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      )}

      {error && hasJoined && (
        <div className="error-banner floating">{error}</div>
      )}

      {actionOverlay && (
        <div className="action-overlay" aria-live="polite" role="status">
          <div className="action-overlay__content">
            <p>{actionOverlay.text}</p>
          </div>
        </div>
      )}

      {suitPromptCardId && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Elegí el palo para el 10</h3>
            <div className="suit-picker">
              {SUIT_META.map((suit) => (
                <button
                  key={suit.id}
                  type="button"
                  className={`card-tile card-tile--tall ${suit.tone}`}
                  onClick={() => confirmSuitSelection(suit.id)}
                  style={{
                    "--card-tilt": `${getCardTilt(`picker-${suit.id}`)}deg`,
                    "--grain-angle": `${getCardGrainAngle(
                      `picker-${suit.id}`
                    )}deg`,
                  }}
                >
                  <div className="card-face">
                    <span className="card-corner card-corner--top">
                      <span className="card-corner-value">10</span>
                      <span className="card-corner-suit">🃏</span>
                    </span>
                    <div className="card-illustration">
                      <div
                        className="card-ornament-row card-ornament-row--top"
                        aria-hidden="true"
                      >
                        <span className="card-ornament card-ornament--dot">
                          ✶
                        </span>
                        <span className="card-ornament card-ornament--suit">
                          <SuitIcon suit={suit.id} />
                        </span>
                        <span className="card-ornament card-ornament--dot">
                          ✶
                        </span>
                      </div>
                      <span className="card-icon">
                        <SuitIcon suit={suit.id} />
                      </span>
                      <div
                        className="card-ornament-row card-ornament-row--bottom"
                        aria-hidden="true"
                      >
                        <span className="card-ornament card-ornament--dot">
                          ✶
                        </span>
                        <span className="card-ornament card-ornament--suit">
                          <SuitIcon suit={suit.id} />
                        </span>
                        <span className="card-ornament card-ornament--dot">
                          ✶
                        </span>
                      </div>
                      <span className="card-ribbon">{suit.label}</span>
                    </div>
                    <span className="card-corner card-corner--bottom">
                      <span className="card-corner-value">10</span>
                      <span className="card-corner-suit">🃏</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ghost"
              onClick={cancelSuitSelection}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
