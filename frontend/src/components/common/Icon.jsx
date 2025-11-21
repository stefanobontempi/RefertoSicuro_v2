import { Icon as IconifyIcon } from '@iconify/react';

/**
 * GDPR-compliant Icon component using @iconify/react
 * Le icone vengono caricate in bundle, senza connessioni esterne a CDN terze parti
 *
 * @param {string} icon - Nome dell'icona (es. "mdi:home", "lucide:menu")
 * @param {string} className - Classi CSS aggiuntive
 * @param {number|string} width - Larghezza icona (default: auto)
 * @param {number|string} height - Altezza icona (default: auto)
 * @param {object} style - Stili inline aggiuntivi
 * @param {function} onClick - Handler click
 * @param {object} ...props - Altri props passati a Iconify
 */
const Icon = ({ icon, className = '', width, height, style, onClick, ...props }) => {
  return (
    <IconifyIcon
      icon={icon}
      className={className}
      width={width}
      height={height}
      style={style}
      onClick={onClick}
      {...props}
    />
  );
};

export default Icon;
