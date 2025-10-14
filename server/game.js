import { v4 as uuidv4 } from "uuid";

const SUITS = ["oros", "copas", "espadas", "bastos"];
const SUIT_LABELS = {
  oros: "Oros",
  copas: "Copas",
  espadas: "Espadas",
  bastos: "Bastos",
};
const VALUES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

const INITIAL_HAND_OPTIONS = {
  2: [7, 6],
  3: [6, 5],
  4: [5, 4],
  5: [4],
  6: [4],
};

class Game {
  constructor({ io, roomId, roomName, onStateChange }) {
    this.io = io;
    this.roomId = roomId;
    this.roomName = roomName;
    this.onStateChange = onStateChange;
    this.createdAt = Date.now();
    this.reset();
  }

  setRoomName(name) {
    this.roomName = name;
  }

  reset() {
    this.phase = "lobby";
    this.players = [];
    this.hostId = null;
    this.drawPile = [];
    this.discardPile = [];
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.pendingDraw = 0;
    this.repeatConstraint = null;
    this.currentSuitOverride = null;
    this.lastAction = null;
    this.winnerId = null;
    this.messages = [];
  }

  addPlayer(socketId, name, providedToken) {
    const trimmed = (name || "").trim().slice(0, 32);
    const displayName = trimmed || "Jugador";

    if (providedToken) {
      const playerByToken = this.players.find(
        (player) => player.token === providedToken
      );
      if (playerByToken) {
        const previousId = playerByToken.id;
        playerByToken.id = socketId;
        playerByToken.name = displayName;
        playerByToken.connected = true;
        if (this.hostId === previousId) {
          this.hostId = socketId;
        }
        this.log(`${playerByToken.name} se reconectó a la partida.`);
        this.onStateChange?.();
        return { player: playerByToken, previousId };
      }
    }

    const existing = this.players.find((p) => p.id === socketId);
    if (existing) {
      existing.name = displayName;
      existing.connected = true;
      this.log(`${existing.name} se reconectó.`);
      this.onStateChange?.();
      return { player: existing, previousId: null };
    }

    if (this.phase !== "lobby") {
      throw new Error(
        "La partida está en curso. Esperá a la siguiente ronda para unirte."
      );
    }

    const player = {
      id: socketId,
      token: uuidv4(),
      name: displayName,
      hand: [],
      declaredLastCard: false,
      connected: true,
    };
    this.players.push(player);
    if (!this.hostId) {
      this.hostId = socketId;
    }
    this.log(`${displayName} se unió a la partida.`);
    this.onStateChange?.();
    return { player, previousId: null };
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex((p) => p.id === socketId);
    if (idx === -1) return null;

    const player = this.players[idx];
    player.connected = false;
    this.log(`${player.name} se desconectó.`);

    if (this.phase === "lobby") {
      this.players.splice(idx, 1);
      if (this.hostId === socketId) {
        this.hostId = this.players[0]?.id || null;
        if (this.hostId) {
          this.log(
            `${this.getPlayer(this.hostId).name} es el nuevo anfitrión.`
          );
        }
      }
    }
    this.onStateChange?.();
    return { player };
  }

  getPlayer(playerId) {
    return this.players.find((p) => p.id === playerId);
  }

  getActivePlayer() {
    if (!this.players.length) return null;
    return this.players[this.currentPlayerIndex];
  }

  getAllowedHandSizes() {
    const count = this.players.filter((p) => p.connected).length;
    return INITIAL_HAND_OPTIONS[count] || [];
  }

  start({ requesterId, cardsPerPlayer }) {
    try {
      console.log(
        `[Game.start] Intentando iniciar partida. Phase actual: ${this.phase}, Requester: ${requesterId}, Host: ${this.hostId}`
      );

      if (this.phase !== "lobby") {
        throw new Error("La partida ya comenzó");
      }

      if (requesterId !== this.hostId) {
        throw new Error("Solo el anfitrión puede iniciar la partida");
      }

      const activePlayers = this.players.filter((p) => p.connected);
      if (activePlayers.length < 2) {
        throw new Error("Se necesitan al menos dos jugadores");
      }

      const allowed = this.getAllowedHandSizes();
      if (!allowed.length) {
        throw new Error("Cantidad de jugadores no soportada");
      }

      const handSize = allowed.includes(cardsPerPlayer)
        ? cardsPerPlayer
        : allowed[0];

      console.log(`[Game.start] Validaciones pasadas. Creando mazo...`);

      this.phase = "playing";
      this.drawPile = this.createShuffledDeck();
      this.discardPile = [];
      this.pendingDraw = 0;
      this.repeatConstraint = null;
      this.currentSuitOverride = null;
      this.currentPlayerIndex = 0;
      this.direction = 1;
      this.winnerId = null;
      this.lastAction = null;

      console.log(
        `[Game.start] Repartiendo ${handSize} cartas a ${activePlayers.length} jugadores...`
      );

      activePlayers.forEach((player) => {
        player.hand = [];
        player.declaredLastCard = false;
        for (let i = 0; i < handSize; i += 1) {
          player.hand.push(this.drawCard());
        }
      });

      console.log(`[Game.start] Cartas repartidas. Buscando carta inicial...`);

      // Initialize discard pile with a non-action card if possible.
      let firstCard = this.drawCard();
      let attempts = 0;
      const maxAttempts = 50; // Evitar bucle infinito

      while (
        [2, 4, 10, 11, 12].includes(firstCard.value) &&
        attempts < maxAttempts
      ) {
        this.drawPile.unshift(firstCard);
        firstCard = this.drawCard();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.warn(
          `[Game.start] No se encontró carta no-acción después de ${maxAttempts} intentos. Usando carta actual.`
        );
      }

      this.discardPile.push(firstCard);
      this.currentSuitOverride = null;

      console.log(
        `[Game.start] Carta inicial: ${firstCard.value} de ${firstCard.suit}`
      );

      this.lastAction = `La partida comenzó. Empieza ${
        this.getActivePlayer().name
      }.`;
      this.log(this.lastAction);

      console.log(
        `[Game.start] Partida iniciada exitosamente. Jugadores activos: ${activePlayers.length}, Cartas por jugador: ${handSize}`
      );
      this.broadcast();
    } catch (error) {
      console.error(`[Game.start] ERROR CRÍTICO:`, error);
      console.error(`[Game.start] Stack:`, error.stack);
      // Revertir al lobby si falla
      this.phase = "lobby";
      throw error;
    }
  }

  createShuffledDeck() {
    const deck = [];
    SUITS.forEach((suit) => {
      VALUES.forEach((value) => {
        deck.push({
          id: uuidv4(),
          suit,
          value,
        });
      });
    });
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  drawCard() {
    if (!this.drawPile.length) {
      this.refillFromDiscard();
    }
    const card = this.drawPile.shift();
    if (!card) {
      throw new Error("No quedan cartas en el mazo");
    }
    return card;
  }

  refillFromDiscard() {
    if (this.discardPile.length <= 1) {
      return;
    }
    const top = this.discardPile.pop();
    this.drawPile = [...this.discardPile];
    for (let i = this.drawPile.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [
        this.drawPile[j],
        this.drawPile[i],
      ];
    }
    this.discardPile = [top];
  }

  validateTurn(playerId) {
    const activePlayer = this.getActivePlayer();
    if (!activePlayer) {
      throw new Error("No hay jugadores activos");
    }
    if (activePlayer.id !== playerId) {
      const offender = this.getPlayer(playerId);
      if (offender) {
        this.penalize(offender, 2, "Acción fuera de turno");
      }
      throw new Error("No es tu turno");
    }
    return activePlayer;
  }

  penalize(player, cardCount, reason) {
    const cards = [];
    for (let i = 0; i < cardCount; i += 1) {
      cards.push(this.drawCard());
    }
    player.hand.push(...cards);
    player.declaredLastCard = false;
    this.log(
      `${player.name} recibió ${cardCount} carta(s) de penalización. Motivo: ${reason}.`
    );
  }

  handleDraw({ playerId }) {
    const player = this.validateTurn(playerId);

    if (this.pendingDraw > 0) {
      this.grantPendingDraw(player);
      this.advanceTurn();
      this.broadcast();
      return;
    }

    const card = this.drawCard();
    player.hand.push(card);
    player.declaredLastCard = false;

    // Verificar si la carta robada es jugable inmediatamente
    const drawnCardIsPlayable = this.isPlayable(card);

    const hasPlayableCards = player.hand.some((handCard) =>
      this.isPlayable(handCard)
    );

    let message = `${player.name} robó una carta.`;

    if (drawnCardIsPlayable) {
      message += " La carta robada se puede jugar inmediatamente.";
    } else if (hasPlayableCards) {
      message += " Tiene cartas jugables en su mano.";
    } else {
      message += " No tiene cartas jugables, pasa el turno.";
      this.repeatConstraint = null;
      this.advanceTurn();
    }

    this.lastAction = message;
    this.log(message);
    this.broadcast();
  }

  grantPendingDraw(player) {
    for (let i = 0; i < this.pendingDraw; i += 1) {
      player.hand.push(this.drawCard());
    }
    const message = `${player.name} recibió ${this.pendingDraw} carta(s) por acumulación de doses.`;
    this.log(message);
    this.lastAction = message;
    this.pendingDraw = 0;
    this.repeatConstraint = null;
    player.declaredLastCard = false;
  }

  handlePlay({ playerId, cardId, chosenSuit }) {
    const player = this.validateTurn(playerId);
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      throw new Error("Carta no encontrada en tu mano");
    }
    const card = player.hand[cardIndex];

    if (this.pendingDraw > 0 && card.value !== 2) {
      throw new Error("Debes responder al 2 con otro 2 o robar");
    }

    if (this.repeatConstraint && player.id !== this.repeatConstraint.playerId) {
      this.repeatConstraint = null;
    }

    if (this.repeatConstraint && card.value !== 11) {
      if (card.suit !== this.repeatConstraint.suit) {
        throw new Error("Debes repetir con el mismo palo o con un 11");
      }
    }

    if (!this.isPlayable(card)) {
      throw new Error("La carta no coincide con el palo o número actual");
    }

    if (card.value === 10 && !SUITS.includes(chosenSuit)) {
      throw new Error("Debes elegir un palo válido para el comodín 10");
    }

    player.hand.splice(cardIndex, 1);
    this.discardPile.push(card);
    let message = `${player.name} jugó ${this.describeCard(card)}.`;
    let skipNextPlayer = false;
    let advanceAfterPlay = true;
    let newSuitOverride = null;

    switch (card.value) {
      case 2:
        this.pendingDraw += 2;
        message += ` El siguiente jugador debe robar ${this.pendingDraw} carta(s) o encadenar otro dos.`;
        break;
      case 4:
        skipNextPlayer = true;
        message += " Saltó al siguiente jugador.";
        break;
      case 11:
        this.repeatConstraint = {
          playerId: player.id,
          suit: card.suit,
        };
        advanceAfterPlay = false;
        message += " Debe repetir con el mismo palo o un 11.";
        break;
      case 10:
        message += ` Eligió el palo ${SUIT_LABELS[chosenSuit] || chosenSuit}.`;
        newSuitOverride = chosenSuit;
        break;
      case 12:
        this.direction *= -1;
        if (this.players.filter((p) => p.connected).length <= 2) {
          skipNextPlayer = true;
        }
        message += " Cambió el sentido de la ronda.";
        break;
      default:
        break;
    }

    if (card.value !== 11) {
      this.repeatConstraint = null;
    }

    this.currentSuitOverride = newSuitOverride;
    if (card.value === 10 && newSuitOverride) {
      message += ` Ahora el palo a seguir es ${
        SUIT_LABELS[newSuitOverride] || newSuitOverride
      }.`;
    }

    if (player.hand.length === 1) {
      player.declaredLastCard = false;
    }

    this.lastAction = message;
    this.log(message);

    if (!player.hand.length) {
      this.phase = "finished";
      this.winnerId = player.id;
      this.lastAction = `${player.name} ganó la partida. ¡Felicitaciones!`;
      this.log(this.lastAction);
      this.broadcast();
      return;
    }

    if (advanceAfterPlay) {
      this.advanceTurn(skipNextPlayer);
    }

    this.broadcast();
  }

  describeCard(card) {
    const names = {
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
    return `${names[card.value]} de ${card.suit}`;
  }

  isPlayable(card) {
    const top = this.discardPile[this.discardPile.length - 1];
    if (!top) return true;

    const currentSuit = this.currentSuitOverride || top.suit;

    // Si hay acumulación de doses, solo se puede jugar otro 2
    if (this.pendingDraw > 0) {
      return card.value === 2;
    }

    // El 10 (comodín) se puede jugar siempre, EXCEPTO cuando hay doses acumulados
    if (card.value === 10) {
      return true;
    }

    if (card.value === top.value) {
      return true;
    }

    if (card.suit === currentSuit) {
      return true;
    }

    return false;
  }

  advanceTurn(skipNext = false) {
    if (!this.players.length) return;
    const steps = skipNext ? 2 : 1;
    this.currentPlayerIndex = this.modIndex(
      this.currentPlayerIndex + steps * this.direction
    );
  }

  modIndex(value) {
    const count = this.players.length;
    return ((value % count) + count) % count;
  }

  handleDeclareLastCard({ playerId }) {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error("Jugador no encontrado");
    if (player.hand.length !== 1) {
      throw new Error("Solo puedes avisar cuando tienes una carta");
    }
    player.declaredLastCard = true;
    this.log(`${player.name} declaró su última carta.`);
    this.broadcast();
  }

  handleCallJodete({ playerId, targetId }) {
    const caller = this.getPlayer(playerId);
    const target = this.getPlayer(targetId);
    if (!caller || !target) {
      throw new Error("Jugador no válido");
    }
    if (target.hand.length !== 1 || target.declaredLastCard) {
      throw new Error("No aplica el jodete en este momento");
    }
    this.penalize(target, 2, "No avisó última carta");
    this.log(`${caller.name} dijo ¡Jodete! a ${target.name}.`);
    this.broadcast();
  }

  handleReset({ requesterId }) {
    console.log(
      `[Game.handleReset] Reiniciando partida. Phase actual: ${this.phase}, Requester: ${requesterId}, Host: ${this.hostId}`
    );

    if (requesterId !== this.hostId) {
      throw new Error("Solo el anfitrión puede reiniciar la partida");
    }

    // Preservar jugadores conectados antes del reset
    const preservedPlayers = this.players
      .filter((player) => player.connected)
      .map((player) => ({
        ...player,
        hand: [],
        declaredLastCard: false,
      }));

    // Resetear el estado del juego (esto pone phase = "lobby")
    this.reset();

    // Restaurar jugadores
    this.players = preservedPlayers;
    if (this.players.length) {
      this.hostId = this.players[0].id;
    }

    // Asegurar que la fase esté en lobby
    this.phase = "lobby";

    console.log(
      `[Game.handleReset] Reset completado. Phase nueva: ${this.phase}, Host: ${this.hostId}, Jugadores: ${this.players.length}`
    );

    this.log("La partida se reinició. Esperando a que comiencen de nuevo.");
    this.broadcast();
  }

  grantState(socket) {
    try {
      if (socket && socket.connected) {
        socket.emit("state", this.buildStateForPlayer(socket.id));
        this.onStateChange?.();
      }
    } catch (error) {
      console.error(`Error al enviar estado a socket ${socket?.id}:`, error);
    }
  }

  broadcast() {
    console.log(
      `[broadcast] Enviando estado a ${this.players.length} jugadores`
    );
    let successCount = 0;
    let errorCount = 0;

    this.players.forEach((player) => {
      try {
        const socket = this.io.sockets.sockets.get(player.id);
        if (socket && socket.connected) {
          socket.emit("state", this.buildStateForPlayer(player.id));
          successCount++;
        } else {
          console.log(
            `[broadcast] Socket ${player.id} no conectado o no existe`
          );
        }
      } catch (error) {
        errorCount++;
        console.error(
          `Error al hacer broadcast a jugador ${player.id}:`,
          error
        );
      }
    });

    console.log(
      `[broadcast] Completado: ${successCount} exitosos, ${errorCount} errores`
    );
    this.onStateChange?.();
  }

  buildStateForPlayer(requesterId) {
    try {
      const requester = this.getPlayer(requesterId);
      const top = this.discardPile[this.discardPile.length - 1] || null;
      const playableCards = requester
        ? requester.hand
            .filter((card) => this.isPlayable(card))
            .map((card) => card.id)
        : [];

      const cardsPerPlayerOptions = this.getAllowedHandSizes();

      return {
        phase: this.phase,
        me: requester
          ? {
              id: requester.id,
              name: requester.name,
              declaredLastCard: requester.declaredLastCard,
              hand: requester.hand,
              playableCardIds: playableCards,
              token: requester.token,
            }
          : null,
        players: this.players.map((player, index) => ({
          id: player.id,
          name: player.name,
          cardCount: player.hand.length,
          declaredLastCard: player.declaredLastCard,
          connected: player.connected,
          isCurrent: index === this.currentPlayerIndex,
          isHost: player.id === this.hostId,
        })),
        topCard: top,
        currentSuit: this.currentSuitOverride || top?.suit || null,
        pendingDraw: this.pendingDraw,
        direction: this.direction,
        lastAction: this.lastAction,
        winnerId: this.winnerId,
        deckCount: this.drawPile.length,
        discardCount: this.discardPile.length,
        messages: this.messages.slice(-20),
        cardsPerPlayerOptions,
        roomId: this.roomId,
        roomName: this.roomName,
      };
    } catch (error) {
      console.error(
        `Error al construir estado para jugador ${requesterId}:`,
        error
      );
      // Retornar estado mínimo para prevenir crash
      return {
        phase: this.phase,
        me: null,
        players: [],
        topCard: null,
        currentSuit: null,
        pendingDraw: 0,
        direction: 1,
        lastAction: "Error al cargar el estado",
        winnerId: null,
        deckCount: 0,
        discardCount: 0,
        messages: [],
        cardsPerPlayerOptions: [],
        roomId: this.roomId,
        roomName: this.roomName,
      };
    }
  }

  getSummary() {
    const host = this.getPlayer(this.hostId);
    return {
      id: this.roomId,
      name: this.roomName,
      phase: this.phase,
      createdAt: this.createdAt,
      playerCount: this.getConnectedPlayerCount(),
      totalPlayers: this.players.length,
      hostName: host?.name || null,
      players: this.players.map((player) => ({
        id: player.id,
        name: player.name,
        connected: player.connected,
      })),
    };
  }

  getConnectedPlayerCount() {
    return this.players.filter((player) => player.connected).length;
  }

  isEmpty() {
    return this.players.length === 0;
  }

  log(text) {
    const message = {
      id: uuidv4(),
      text,
      timestamp: Date.now(),
    };
    this.messages.push(message);
    if (this.messages.length > 200) {
      this.messages.shift();
    }
  }
}

export { Game, SUITS, INITIAL_HAND_OPTIONS };
