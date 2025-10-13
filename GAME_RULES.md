# 🃏 Reglas del Jodete - Guía completa

## Objetivo del juego

Ser el primer jugador en quedarse sin cartas en la mano.

## El mazo

- **40 cartas** españolas: 4 palos (Oros, Copas, Espadas, Bastos)
- **Valores**: 1 (As), 2, 3, 4, 5, 6, 7, 10, 11, 12

## Inicio de la partida

1. Los jugadores se unen al lobby (mínimo 2, máximo 6 jugadores)
2. El anfitrión elige cuántas cartas se reparten a cada jugador
3. Se coloca una carta boca arriba para empezar la pila de descarte
4. El turno va rotando en el sentido determinado (inicialmente en sentido horario)

## Reglas básicas

### ¿Cuándo puedo jugar una carta?

Para jugar una carta, debe cumplir **AL MENOS UNA** de estas condiciones:

1. **Mismo palo** que la carta superior de la pila
2. **Mismo número** que la carta superior
3. **Es un 10** (comodín) - ver reglas especiales

### ¿Qué hago si no puedo jugar?

Si no tenés ninguna carta jugable:

1. **Robás UNA carta del mazo**
2. **Si la carta robada es jugable**, podés jugarla INMEDIATAMENTE en el mismo turno
3. **Si no es jugable**, tu turno termina y pasa al siguiente jugador

---

## 🎴 Cartas especiales

### 🔴 Dos (2) - Acumulación de cartas

- **Efecto**: El siguiente jugador debe robar **+2 cartas**
- **Encadenable**: Si el siguiente jugador tiene un 2, puede jugarlo y acumular +4, +6, +8...
- **Importante**:
  - Si hay doses acumulados, **SOLO** podés jugar otro 2
  - **NI SIQUIERA el 10 (comodín) se puede usar** cuando hay doses acumulados
  - Si no tenés otro 2, debés robar todas las cartas acumuladas y perder el turno

**Ejemplo:**

```
Jugador A juega 2 de Oros → +2 acumulado
Jugador B juega 2 de Copas → +4 acumulado
Jugador C no tiene 2 → Roba 4 cartas y pierde el turno
```

### ⏭️ Cuatro (4) - Salto

- **Efecto**: Salta al siguiente jugador
- **Resultado**: El jugador que debería seguir pierde su turno
- **Se puede encadenar**: Si el siguiente jugador también tiene un 4, puede jugarlo y saltear al siguiente

### 🔄 Once (11) - Repetición

- **Efecto**: El mismo jugador debe jugar otra vez
- **Restricción**: Debe jugar una carta del **mismo palo** O **otro 11**
- **Si no tiene**: Debe robar del mazo
- **Termina** cuando el jugador juega una carta que NO sea 11

**Ejemplo:**

```
Jugador A juega 11 de Oros
→ Debe jugar otra carta de Oros o cualquier otro 11
→ Si juega 5 de Oros: turno normal continúa
→ Si juega 11 de Copas: debe repetir con Copas u otro 11
```

### 🃏 Diez (10) - Comodín

- **Efecto**: Se puede jugar **EN CUALQUIER MOMENTO**
- **Excepción**: NO se puede jugar cuando hay doses (2) acumulados
- **Al jugar**: Elegís el nuevo palo que seguirá la partida
- **Es la carta más versátil**: Úsala estratégicamente para cambiar de palo

**Casos de uso:**

```
✅ Carta superior: 7 de Oros → Jugás 10 de Espadas → Elegís "Copas"
✅ Carta superior: As de Bastos → Jugás 10 de cualquier palo
❌ Hay 2 acumulados (+4) → NO podés jugar el 10
```

### ↩️ Doce (12) - Inversión

- **Efecto**: Invierte el sentido del juego
- **Con 3+ jugadores**: Cambia de horario a antihorario o viceversa
- **Con 2 jugadores**: Actúa como un salto (el otro jugador pierde el turno)

**Ejemplo con 4 jugadores:**

```
Antes: A → B → C → D → A
Jugador B juega 12
Después: B → A → D → C → B
```

---

## ⚠️ Penalizaciones

### No avisar "Última carta"

- **Cuándo**: Cuando te quedás con una sola carta en la mano
- **Debes**: Hacer clic en el botón "¡Última carta!" antes de que termine tu turno
- **Si no avisás**: Cualquier jugador puede gritar "¡Jodete!" y **robás 2 cartas**
- **Ventana de oportunidad**: Desde que jugás tu penúltima carta hasta que el siguiente jugador juegue

### Jugar fuera de turno

- **Si intentás jugar cuando no es tu turno**: El sistema lo bloquea automáticamente

---

## 🏆 Victoria

- **Ganador**: El primer jugador en quedarse sin cartas
- **Anuncio**: Se muestra un mensaje de victoria y se puede reiniciar la partida
- **Flash de victoria**: La pantalla parpadea en verde para el ganador

---

## 💡 Estrategias y consejos

### Uso del 10 (comodín)

- **Guardalo** para situaciones críticas donde no tengas opciones
- **Úsalo** para cambiar a un palo del que tengas muchas cartas
- **NO lo uses** si ya tenés una carta jugable del mismo palo/número

### Manejo del 11 (repetición)

- **Tenés ventaja** si tenés varias cartas del mismo palo
- **Riesgo**: Si no podés repetir, robás del mazo y el efecto persiste

### Defensa contra el 2 (acumulación)

- **Guardá un 2** para defenderte de cadenas de doses
- **Observá** cuántos doses se jugaron (máximo 4 en todo el mazo)

### Avisar última carta

- **NO OLVIDÉS** hacer clic en "¡Última carta!" cuando te quede solo una
- **Los otros jugadores** están atentos para gritarte "¡Jodete!"

---

## 🎯 Flujo de un turno típico

1. **Es tu turno** (indicado visualmente en la interfaz)
2. **Opciones**:
   - **A)** Hacer clic en una carta jugable de tu mano
   - **B)** Si no tenés cartas jugables, hacer clic en "Robar del mazo"
3. **Si robaste**:
   - Si la carta robada es jugable, podés jugarla inmediatamente
   - Si no, tu turno termina automáticamente
4. **Si jugaste**:
   - Cartas especiales aplican sus efectos
   - Si te quedás con 1 carta: ¡Avisá "Última carta"!
   - Si te quedás con 0 cartas: ¡Ganaste!
5. **Turno pasa** al siguiente jugador (respetando saltos e inversiones)

---

## 📝 Resumen de reglas especiales

| Carta  | Nombre       | Efecto                                           | Se puede responder          |
| ------ | ------------ | ------------------------------------------------ | --------------------------- |
| **2**  | Dos          | +2 cartas al siguiente                           | Sí, con otro 2 (acumulable) |
| **4**  | Cuatro       | Salta al siguiente                               | Sí, con otro 4              |
| **10** | Diez/Comodín | Jugable siempre (excepto con doses), elegís palo | No                          |
| **11** | Once         | Repetís turno con mismo palo u otro 11           | No                          |
| **12** | Doce         | Invierte sentido (o salta con 2 jugadores)       | No                          |

---

## ❓ Preguntas frecuentes

**P: ¿Puedo jugar un 10 cuando hay un 2 en la pila?**  
R: Solo si hay doses **acumulados** (pendientes de robar). Si simplemente hay un 2 en la pila pero ya se resolvió, sí podés jugarlo.

**P: ¿Qué pasa si robo del mazo y la carta es un 11?**  
R: Podés jugarlo inmediatamente y deberás repetir turno con el mismo palo u otro 11.

**P: ¿Puedo jugar un 10 para responder a un 2?**  
R: NO. Cuando hay doses acumulados, solo se puede jugar otro 2.

**P: ¿Qué pasa si me olvido de avisar "última carta"?**  
R: Cualquier jugador puede hacer clic en "¡Jodete!" y deberás robar 2 cartas como penalización.

**P: ¿El 12 siempre invierte el sentido?**  
R: Sí, pero con 2 jugadores solo actúa como salto (el otro jugador pierde el turno).

**P: ¿Puedo jugar múltiples cartas en un turno?**  
R: Solo en caso del 11 (repetición). El resto de las cartas terminan tu turno normalmente.

---

## 🎮 Interfaz y controles

- **Tu mano**: Cartas en la parte inferior de la pantalla
- **Pila de descarte**: Carta central grande (la última jugada)
- **Mazo**: Botón para robar (solo activo en tu turno)
- **Botón "¡Última carta!"**: Aparece cuando te queda 1 carta
- **Botón "¡Jodete!"**: Para penalizar a quien no avisó última carta
- **Modal de palo**: Aparece automáticamente al jugar un 10
- **Log de eventos**: Panel derecho con historial de acciones
- **Indicador de turno**: Resalta al jugador actual

---

## 🔧 Implementación técnica

Estas reglas están implementadas en `server/game.js`:

- **Validación de jugadas**: Método `isPlayable(card)`
- **Lógica de doses**: `pendingDraw` + restricción en `isPlayable`
- **Comodín (10)**: Permitido siempre excepto cuando `pendingDraw > 0`
- **Robo inteligente**: `handleDraw` verifica si la carta robada es jugable
- **Repetición (11)**: Variable `repeatConstraint` mantiene el palo activo
- **Inversión (12)**: Variable `direction` multiplica por -1

---

**Versión del documento**: 1.1  
**Última actualización**: 13 de octubre de 2025
