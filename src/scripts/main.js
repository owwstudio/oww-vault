import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import 'lenis/dist/lenis.css';
import '../styles/main.scss';
import { createSound } from './sound.js';
import { createGallery } from './gallery.js';
import projects from '../data/projects.json';

const sound = createSound(document.querySelector('[data-sound]'));
if (projects.length) createGallery(projects, sound);
