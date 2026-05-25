/**
 * Normalize streaming URLs for embedding and choose HTML5 video vs iframe.
 */
export function toEmbedVideoUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    try {
        const u = new URL(trimmed);
        if (u.hostname.includes('youtube.com') && u.pathname === '/watch') {
            const v = u.searchParams.get('v');
            if (v) return `https://www.youtube.com/embed/${v}`;
        }
        if (u.hostname === 'youtu.be') {
            const id = u.pathname.replace(/^\//, '').split('/')[0];
            if (id) return `https://www.youtube.com/embed/${id}`;
        }
    } catch {
        /* not absolute URL */
    }
    return trimmed;
}

export function shouldUseVideoElement(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
        /\.(mp4|webm|ogg)(\?|$)/i.test(lower) ||
        lower.startsWith('blob:') ||
        (lower.startsWith('http') &&
            !lower.includes('youtube.com') &&
            !lower.includes('youtu.be') &&
            !lower.includes('vimeo.com') &&
            !lower.includes('/embed'))
    );
}
