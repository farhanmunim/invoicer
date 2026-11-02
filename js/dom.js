/* Tiny DOM and media-query helpers shared by every UI module. */
import { MOBILE_QUERY } from "./config.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

const mobileMedia = window.matchMedia(MOBILE_QUERY);
export const isMobile = () => mobileMedia.matches;
export const isCoarsePointer = () => window.matchMedia("(pointer: coarse)").matches;
