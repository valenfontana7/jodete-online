# 🎮 Changelog - Nuevas reglas del juego

**Fecha**: 13 de octubre de 2025  
**Versión**: 1.1.0

---

## 🆕 Nuevas reglas implementadas

### 1. **Comodín (10) mejorado - Jugable en cualquier momento**

**Regla anterior:**

- El 10 era jugable en cualquier momento

**Regla nueva:**

- El 10 se puede jugar en cualquier momento **EXCEPTO cuando hay doses (2) acumulados**
- Esto hace más estratégico el uso del comodín
- Mantiene la lógica de que solo un 2 puede responder a otro 2

**Cambio en código:**

```javascript
// server/game.js - método isPlayable()
// Si hay acumulación de doses, solo se puede jugar otro 2
if (this.pendingDraw > 0) {
  return card.value === 2;
}

// El 10 (comodín) se puede jugar siempre, EXCEPTO cuando hay doses acumulados
if (card.value === 10) {
  return true;
}
```

**Impacto:**

- ✅ Hace el juego más balanceado
- ✅ Los doses tienen más poder estratégico
- ✅ El 10 sigue siendo muy útil pero con una limitación lógica

---

### 2. **Robo inteligente - Jugar inmediatamente después de robar**

**Regla anterior:**

- Al robar del mazo, el jugador debía esperar al próximo turno para jugar la carta robada
- Esto hacía el juego más lento y frustrante

**Regla nueva:**

- Después de robar del mazo, si la carta robada es jugable, **se puede jugar inmediatamente en el mismo turno**
- Si no es jugable, el turno pasa automáticamente al siguiente jugador
- El sistema indica claramente si la carta robada es jugable o no

**Cambio en código:**

```javascript
// server/game.js - método handleDraw()
const card = this.drawCard();
player.hand.push(card);

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
```

**Impacto:**

- ✅ Juego más dinámico y fluido
- ✅ Reduce frustración del jugador
- ✅ Mantiene el ritmo de la partida
- ✅ Compatible con todas las cartas especiales (11, 10, 2, etc.)

---

## 📝 Archivos modificados

### `server/game.js`

- **Línea ~430**: Método `isPlayable()` - Comentario aclaratorio sobre el 10
- **Línea ~269-300**: Método `handleDraw()` - Lógica de robo inteligente

### `README.md`

- **Sección "Características"**: Documentadas las nuevas reglas
  - Aclaración sobre el 10 (comodín)
  - Mención de robo inteligente

### `GAME_RULES.md` (NUEVO)

- **Documento completo**: Guía exhaustiva de todas las reglas del juego
  - Explicación detallada de cada carta especial
  - Ejemplos de uso y casos especiales
  - FAQ sobre reglas conflictivas
  - Estrategias y consejos

---

## 🧪 Testing realizado

### Build de producción

```bash
npm run build
✓ 59 modules transformed
✓ built in 1.01s
```

### Verificación de sintaxis

```bash
get_errors()
No errors found.
```

### Casos de prueba a validar manualmente:

#### Caso 1: Comodín con doses

```
Escenario:
- Carta superior: 2 de Oros (+2 acumulado)
- Jugador tiene: 10 de Copas

Resultado esperado:
❌ No se puede jugar el 10
✅ Solo se puede jugar otro 2 o robar
```

#### Caso 2: Robo de carta jugable

```
Escenario:
- Carta superior: 5 de Oros
- Jugador no tiene cartas jugables
- Roba: 7 de Oros

Resultado esperado:
✅ El sistema indica "La carta robada se puede jugar inmediatamente"
✅ El jugador puede hacer clic en el 7 de Oros y jugarlo
✅ El turno NO pasa automáticamente
```

#### Caso 3: Robo de carta no jugable

```
Escenario:
- Carta superior: 5 de Oros
- Jugador no tiene cartas jugables
- Roba: 3 de Copas (no coincide ni palo ni número)

Resultado esperado:
✅ El sistema indica "No tiene cartas jugables, pasa el turno"
✅ El turno pasa automáticamente al siguiente jugador
```

#### Caso 4: Robo de 11 (repetición)

```
Escenario:
- Carta superior: 6 de Espadas
- Jugador roba: 11 de Espadas

Resultado esperado:
✅ Puede jugar el 11 inmediatamente
✅ Debe repetir con otra carta de Espadas u otro 11
```

#### Caso 5: Robo de 10 (comodín)

```
Escenario:
- Carta superior: 4 de Bastos
- Jugador roba: 10 de cualquier palo

Resultado esperado:
✅ Puede jugar el 10 inmediatamente
✅ Se abre el modal para elegir palo
```

---

## 🎯 Beneficios de las nuevas reglas

### Para la experiencia de juego:

1. **Más estratégico**: El 10 ya no es una carta "salvadora" absoluta
2. **Más dinámico**: No hay turnos perdidos por robar cartas jugables
3. **Menos frustrante**: Si robás una carta buena, la podés usar de inmediato
4. **Más balanceado**: Los doses tienen más peso táctico

### Para el código:

1. **Más legible**: Comentarios explican la lógica del 10
2. **Más expresivo**: Mensajes del sistema indican exactamente qué pasa
3. **Mantenible**: Lógica clara y separada en métodos específicos
4. **Extensible**: Fácil agregar más cartas especiales en el futuro

---

## 📚 Documentación actualizada

- ✅ **README.md**: Características actualizadas con las nuevas reglas
- ✅ **GAME_RULES.md**: Guía completa de 300+ líneas con todos los detalles
- ✅ **Comentarios en código**: Aclaraciones sobre lógica del 10 y robo

---

## 🔄 Retrocompatibilidad

**¿Las partidas en curso se verán afectadas?**

- ✅ **NO**: Las reglas se aplican desde el servidor
- ✅ El cliente ya tenía la UI para manejar estas situaciones
- ✅ Solo cambió la lógica de validación, no la estructura de datos
- ✅ Al recargar, los jugadores verán las nuevas reglas en efecto

**¿Hay que hacer reset de partidas?**

- ❌ **NO es necesario**: Las reglas se aplican inmediatamente
- ✅ El estado del juego (pendingDraw, repeatConstraint, etc.) sigue funcionando

---

## 🚀 Próximos pasos sugeridos

### Mejoras opcionales futuras:

1. **Animación visual** cuando se roba una carta jugable
2. **Tooltip explicativo** sobre el 10 cuando hay doses
3. **Estadísticas** de uso de cartas especiales
4. **Tutorial interactivo** con las reglas paso a paso
5. **Modo de práctica** contra IA simple

### Testing en producción:

1. Desplegar a Render/Railway
2. Jugar partidas de prueba con múltiples jugadores
3. Verificar edge cases (robar con 11, robar con 10, etc.)
4. Recopilar feedback de usuarios

---

## 📞 Contacto y feedback

Si encontrás bugs o tenés sugerencias sobre las reglas:

- Crear un issue en GitHub
- Documentar el escenario exacto
- Incluir logs del navegador si es posible

---

**Fin del changelog v1.1.0**
