import { handleRequest } from './handler';

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
// const DEBUG = false;

addEventListener('fetch', (event) => {
    console.log('got event');
    event.respondWith(handleRequest(event));
});