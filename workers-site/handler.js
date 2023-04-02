import { getAssetFromKV, serveSinglePageApp} from '@cloudflare/kv-asset-handler';
import { redirects } from './data.js';

const GH_URL = `https://github.com/VisheshBansal`;

export async function handleRequest(event) {
    return performRedirect(event);
}

async function getPageFromKV(event) {
    const url = new URL(event.request.url);
    let options = {};
    try {
        return await getAssetFromKV(event, options);
        //on error try appending html
    } catch (e) {
        return await getAssetFromKV(event, { mapRequestToAsset: serveSinglePageApp })
        // return new Response(e.message || e.toString(), { status: 500 });
    }
}

async function performRedirect(event) {
    const urlParts = event.request.url
        .split('?')[0]
        .replace(BASE_URL, '')
        .split('/')
        .map((s) => s.toLowerCase());
    if (redirects[urlParts[0]]) {
        return Response.redirect(redirects[urlParts[0]]['url'], 301);
    }
    if (urlParts[0] == 'gh') {
        switch (urlParts.length) {
            case 1:
                return Response.redirect(GH_URL, 301);
            case 2:
                return Response.redirect(`${GH_URL}/${urlParts[1]}`, 301);
            case 3:
                return Response.redirect(
                    `${GH_URL}/${urlParts[1]}/commit/${urlParts[2]}`,
                    301
                );
            case 4:
                return Response.redirect(
                    `${GH_URL}/${urlParts[1]}/issues/${urlParts[3]}`,
                    301
                );
        }
    }
    return getPageFromKV(event);
}