import orosSvg from './assets/suits/oros.svg';
import copasSvg from './assets/suits/copas.svg';
import espadasSvg from './assets/suits/espadas.svg';
import bastosSvg from './assets/suits/bastos.svg';

const SUIT_ICONS = {
  oros: orosSvg,
  copas: copasSvg,
  espadas: espadasSvg,
  bastos: bastosSvg,
};

export function SuitIcon({ suit, className = '', style = {} }) {
  const iconSrc = SUIT_ICONS[suit];
  
  if (!iconSrc) {
    return <span className={className}>?</span>;
  }

  return (
    <img
      src={iconSrc}
      alt={suit}
      className={`suit-icon ${className}`}
      style={style}
    />
  );
}

export default SuitIcon;
