import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import LoginButton from "./components/LoginButton";
import Rankings from "./components/Rankings";
import RoomSelector from "./components/RoomSelector";
import PlayersList from "./components/PlayersList";
import LobbyControls from "./components/LobbyControls";
import GameBoard from "./components/GameBoard";
import PlayerHand from "./components/PlayerHand";
import GameLog from "./components/GameLog";
import SuitSelector from "./components/SuitSelector";
import { useAuth } from "./contexts/AuthContext";
import { SUIT_META } from "./constants/gameConstants";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SUIT_INDEX = SUIT_META.reduce((acc, suit, index) => {
  acc[suit.id] = index;
  return acc;
}, {});

const STORAGE_KEYS = {
  playerToken: "playerToken",
  roomId: "lastRoomId",
};

const readSessionOrLocal = (key) => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const sessionValue = window.sessionStorage.getItem(key);
    if (sessionValue) {
      return sessionValue;
    }
    const localValue = window.localStorage.getItem(key);
    if (localValue) {
      window.sessionStorage.setItem(key, localValue);
      return localValue;
    }
  } catch (error) {
    console.warn(`[storage] No se pudo leer la clave ${key}:`, error);
  }
  return null;
};

const persistValue = (key, value) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (value == null) {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } else {
      const normalized = String(value);
      window.sessionStorage.setItem(key, normalized);
      window.localStorage.setItem(key, normalized);
    }
  } catch (error) {
    console.warn(`[storage] No se pudo persistir la clave ${key}:`, error);
  }
};

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
  return readSessionOrLocal(STORAGE_KEYS.playerToken);
};

const getInitialRoomId = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return readSessionOrLocal(STORAGE_KEYS.roomId);
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

const MOBILE_SECTIONS = [
  { id: "board", label: "Tablero", icon: "🎴" },
  { id: "players", label: "Jugadores", icon: "👥" },
  { id: "log", label: "Historial", icon: "📝" },
];

function useMediaQuery(query) {
  const getMatches = () => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {};
    }
    const mediaQueryList = window.matchMedia(query);
    const listener = (event) => setMatches(event.matches);
    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

const FLASH_DURATIONS = {
  turn: 1200,
  victory: 1600,
  defeat: 1600,
};

function App() {
  const { getToken, isAuthenticated, refreshUser } = useAuth();
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
  const [showRankings, setShowRankings] = useState(false);
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
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [mobileSection, setMobileSection] = useState("board");
  const [showMobileUtility, setShowMobileUtility] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setMobileSection("board");
      setShowMobileUtility(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const authToken = getToken();
    console.log(
      `🔍 [CLIENT] Inicializando socket. Token presente: ${!!authToken}, isAuthenticated: ${isAuthenticated}`
    );

    const instance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token: authToken, // Enviar JWT al conectar
      },
    });
    setSocket(instance);

    instance.on("connect", () => {
      setSocketConnected(true);
      console.log("Conectado al servidor");
      console.log(
        `🔍 [CLIENT] Token enviado al servidor: ${
          authToken ? authToken.substring(0, 20) + "..." : "null"
        }`
      );

      // Reintentar reconexión automática si había un token y roomId guardados
      const savedToken =
        typeof window !== "undefined"
          ? readSessionOrLocal(STORAGE_KEYS.playerToken)
          : null;
      const savedRoomId =
        typeof window !== "undefined"
          ? readSessionOrLocal(STORAGE_KEYS.roomId)
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
          persistValue(STORAGE_KEYS.roomId, null);
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
      if (state?.roomId) {
        persistValue(STORAGE_KEYS.roomId, state.roomId);
      }
      if (state?.roomId) {
        setStoredRoomId(state.roomId);
      }
      if (state?.me?.token) {
        setPlayerToken((prev) => {
          if (prev === state.me.token) {
            return prev;
          }
          persistValue(STORAGE_KEYS.playerToken, state.me.token);
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
          persistValue(STORAGE_KEYS.roomId, null);
          autoJoinAttemptedRef.current = false;
          return null;
        });
      }
    });
    instance.on("joinedRoom", ({ roomId }) => {
      setHasJoined(true);
      setPendingJoin(false);
      setPendingLeave(false);
      persistValue(STORAGE_KEYS.roomId, roomId);
      setStoredRoomId(roomId);
    });
    instance.on("leftRoom", () => {
      setGameState(null);
      setHasJoined(false);
      setPendingJoin(false);
      setPendingLeave(false);
      persistValue(STORAGE_KEYS.roomId, null);
      persistValue(STORAGE_KEYS.playerToken, null);
      autoJoinAttemptedRef.current = false;
      setStoredRoomId(null);
    });
    instance.on("connect_error", (err) => {
      console.error("Error de conexión con el servidor", err);
      setError(
        "No se pudo conectar con el servidor. Verificá que el backend esté activo."
      );
    });

    // Escuchar actualizaciones de estadísticas
    instance.on("statsUpdated", (data) => {
      console.log("📊 Estadísticas actualizadas desde el servidor:", data);
      // Refrescar los datos del usuario
      refreshUser();
    });

    return () => {
      instance.disconnect();
    };
  }, [getToken, isAuthenticated, refreshUser]);

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

    // No mostrar overlay para jugadas regulares cuando hay jugadores con 1 carta
    // Esto permite que el botón "Jodete" sea clickeable sin interrupciones
    const isRegularPlay =
      message.includes("jugó") &&
      !message.includes("ganó") &&
      !message.includes("¡Jodete!");

    // Verificar si hay jugadores con 1 carta que no avisaron (posibles objetivos de Jodete)
    const hasJodeteTargets = gameState?.players?.some(
      (player) =>
        player.id !== gameState?.me?.id &&
        player.cardCount === 1 &&
        !player.declaredLastCard &&
        player.connected
    );

    if (isRegularPlay && hasJodeteTargets) {
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
  }, [
    gameState?.lastAction,
    gameState?.me?.name,
    gameState?.players,
    gameState?.me?.id,
  ]);

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
      }
      persistValue(STORAGE_KEYS.playerToken, null);
      persistValue(STORAGE_KEYS.roomId, null);
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
    persistValue(STORAGE_KEYS.roomId, null);
    persistValue(STORAGE_KEYS.playerToken, null);
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
  const connectionLabel = socketConnected
    ? "Conectado"
    : socket
    ? "Reconectando..."
    : "Desconectado";
  const connectionState = socketConnected
    ? "online"
    : socket
    ? "reconnecting"
    : "offline";
  const headerClassName = [
    "app-header",
    hasJoined ? "app-header--playing" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const showTagline = !hasJoined && !isMobile;
  const statusChipLabel = phaseLabel
    ? `${connectionLabel} · ${phaseLabel}`
    : connectionLabel;

  return (
    <div className="app-shell">
      <div className={flashClassName} aria-hidden="true" />
      {!isMobile && (
        <header className={headerClassName}>
          <div className="header-row">
            <div className="branding">
              <h1>Jodete 🫵🏼</h1>
              {showTagline && (
                <p className="brand-tagline">
                  Baraja española, partidas en tiempo real.
                </p>
              )}
            </div>
            <span
              className={`status-chip status-chip--${connectionState}`}
              title={statusChipLabel}
              role="status"
              aria-live="polite"
            >
              <span className="status-chip__dot" aria-hidden="true" />
              <span className="status-chip__text">{statusChipLabel}</span>
            </span>
            <div className="header-actions">
              <button
                className="rankings-button"
                onClick={() => setShowRankings(true)}
                title="Ver Rankings"
                type="button"
              >
                🏆
              </button>
              <LoginButton />
            </div>
          </div>
        </header>
      )}

      {!hasJoined && (
        <RoomSelector
          rooms={rooms}
          roomsLoaded={roomsLoaded}
          joinableRooms={joinableRooms}
          selectedRoomId={selectedRoomId}
          nameInput={nameInput}
          socketConnected={socketConnected}
          pendingJoin={pendingJoin}
          pendingLeave={pendingLeave}
          error={error}
          onNameInputChange={setNameInput}
          onRoomSelect={setSelectedRoomId}
          onJoinSubmit={handleJoinSubmit}
        />
      )}

      {hasJoined &&
        (isMobile ? (
          <div className="mobile-layout">
            <nav className="mobile-nav" aria-label="Secciones del juego">
              {MOBILE_SECTIONS.map((section) => {
                const isActive = mobileSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`mobile-nav__button${
                      isActive ? " mobile-nav__button--active" : ""
                    }`}
                    aria-pressed={isActive}
                    onClick={() => setMobileSection(section.id)}
                  >
                    <span className="mobile-nav__icon" aria-hidden="true">
                      {section.icon}
                    </span>
                    <span className="mobile-nav__label">{section.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                className="mobile-nav__button mobile-nav__button--action"
                onClick={() => setShowRankings(true)}
              >
                <span className="mobile-nav__icon" aria-hidden="true">
                  🏆
                </span>
                <span className="mobile-nav__label">Rankings</span>
              </button>
              <button
                type="button"
                className="mobile-nav__button mobile-nav__button--ghost"
                onClick={() => setShowMobileUtility(true)}
              >
                <span className="mobile-nav__icon" aria-hidden="true">
                  👤
                </span>
                <span className="mobile-nav__label">Cuenta</span>
              </button>
            </nav>
            {showMobileUtility && (
              <div className="mobile-utility" role="dialog" aria-modal="true">
                <button
                  type="button"
                  className="mobile-utility__backdrop"
                  aria-label="Cerrar panel"
                  onClick={() => setShowMobileUtility(false)}
                />
                <div className="mobile-utility__panel">
                  <div className="mobile-utility__header">
                    <h2>Tu cuenta</h2>
                    <button
                      type="button"
                      className="mobile-utility__close"
                      onClick={() => setShowMobileUtility(false)}
                      aria-label="Cerrar"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mobile-utility__status">
                    <span
                      className={`status-chip status-chip--${connectionState}`}
                      title={statusChipLabel}
                    >
                      <span className="status-chip__dot" aria-hidden="true" />
                      <span className="status-chip__text">
                        {statusChipLabel}
                      </span>
                    </span>
                    <p className="mobile-utility__hint">
                      Gestioná tu sesión y revisá el estado de conexión desde
                      aquí.
                    </p>
                  </div>
                  <div className="mobile-utility__content">
                    <LoginButton />
                  </div>
                </div>
              </div>
            )}
            <div className="mobile-section">
              {mobileSection === "board" && (
                <GameBoard
                  gameState={gameState}
                  lastActionKey={lastActionKey}
                  canDraw={canDraw}
                  canDeclareLastCard={canDeclareLastCard}
                  jodeteTargets={jodeteTargets}
                  onDraw={handleDraw}
                  onDeclareLastCard={handleDeclareLastCard}
                  onCallJodete={handleCallJodete}
                >
                  <PlayerHand
                    hand={me?.hand}
                    sortedHand={sortedHand}
                    playableCards={playableCards}
                    isMyTurn={isMyTurn}
                    onPlayCard={handlePlayCard}
                  />
                </GameBoard>
              )}
              {mobileSection === "players" && (
                <PlayersList
                  displayPlayers={displayPlayers}
                  gameState={gameState}
                  isHost={isHost}
                  me={me}
                  pendingLeave={pendingLeave}
                  handleLeaveRoom={handleLeaveRoom}
                  handleCallJodete={handleCallJodete}
                >
                  {gameState?.phase === "lobby" && (
                    <LobbyControls
                      isHost={isHost}
                      cardsPerPlayer={cardsPerPlayer}
                      cardsPerPlayerOptions={gameState?.cardsPerPlayerOptions}
                      canStart={canStart}
                      onCardsPerPlayerChange={setCardsPerPlayer}
                      onStart={handleStart}
                    />
                  )}

                  {gameState?.phase === "finished" && isHost && (
                    <button
                      type="button"
                      className="primary"
                      onClick={handleReset}
                      style={{ marginTop: "1rem" }}
                    >
                      Nueva partida
                    </button>
                  )}
                </PlayersList>
              )}
              {mobileSection === "log" && (
                <GameLog messages={gameState?.messages} />
              )}
            </div>
          </div>
        ) : (
          <div className="layout-grid">
            <PlayersList
              displayPlayers={displayPlayers}
              gameState={gameState}
              isHost={isHost}
              me={me}
              pendingLeave={pendingLeave}
              handleLeaveRoom={handleLeaveRoom}
              handleCallJodete={handleCallJodete}
            >
              {gameState?.phase === "lobby" && (
                <LobbyControls
                  isHost={isHost}
                  cardsPerPlayer={cardsPerPlayer}
                  cardsPerPlayerOptions={gameState?.cardsPerPlayerOptions}
                  canStart={canStart}
                  onCardsPerPlayerChange={setCardsPerPlayer}
                  onStart={handleStart}
                />
              )}

              {gameState?.phase === "finished" && isHost && (
                <button
                  type="button"
                  className="primary"
                  onClick={handleReset}
                  style={{ marginTop: "1rem" }}
                >
                  Nueva partida
                </button>
              )}
            </PlayersList>

            <GameBoard
              gameState={gameState}
              lastActionKey={lastActionKey}
              canDraw={canDraw}
              canDeclareLastCard={canDeclareLastCard}
              jodeteTargets={jodeteTargets}
              onDraw={handleDraw}
              onDeclareLastCard={handleDeclareLastCard}
              onCallJodete={handleCallJodete}
            >
              <PlayerHand
                hand={me?.hand}
                sortedHand={sortedHand}
                playableCards={playableCards}
                isMyTurn={isMyTurn}
                onPlayCard={handlePlayCard}
              />
            </GameBoard>

            <GameLog messages={gameState?.messages} />
          </div>
        ))}

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
        <SuitSelector
          onConfirm={confirmSuitSelection}
          onCancel={cancelSuitSelection}
        />
      )}

      {showRankings && <Rankings onClose={() => setShowRankings(false)} />}
    </div>
  );
}

export default App;
