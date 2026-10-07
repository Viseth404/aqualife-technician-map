// Map icons shared by the admin map (MapCard) and the phone map (FieldMap).
import { renderToStaticMarkup } from 'react-dom/server';
import L from '../lib/leaflet';
import { config } from '../config';

// Turn a small React drawing into a Leaflet icon centered on its point.
export const centeredIcon = (element) =>
  L.divIcon({
    className: 'map-label',
    html: `<div style="transform:translate(-50%,-50%);width:max-content">${renderToStaticMarkup(element)}</div>`,
    iconSize: [0, 0],
  });

export const officeIcon = centeredIcon(
  <div className="flex flex-col items-center">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-lg ring-2" style={{ '--tw-ring-color': config.brandColor }}>
      <img src={config.logoIcon} alt="" className="h-9 w-9 object-contain" />
    </div>
    <span className="mt-1 whitespace-nowrap rounded bg-white px-1.5 text-[11px] font-semibold shadow" style={{ color: config.brandColor }}>
      {config.businessName}
    </span>
  </div>,
);

export const customerIcon = L.divIcon({
  className: 'map-label',
  html: '<div style="font-size:36px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))">📍</div>',
  iconSize: [0, 0],
});

