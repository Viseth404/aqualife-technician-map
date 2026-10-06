// Leaflet + Geoman (the zone drawing tool), loaded in the right order.
// Other files import Leaflet from here: import L from '../lib/leaflet';
import L from 'leaflet';
import './leaflet-global';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

export default L;
