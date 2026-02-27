import axios from 'axios';
import dns from 'dns';

export async function analyzeDomain(domain) {
    let result = { domain, status: 'PENDING', remark: '', notes: '' };
    try {
        const addresses = await dns.promises.resolve4(domain).catch(() => null);
        if (!addresses) return { ...result, status: 'DOWN', remark: 'DOWN', notes: 'DNS Resolve Failed' };

        const response = await axios.get(`http://${domain}`, { 
            timeout: 10000, 
            validateStatus: () => true,
            maxRedirects: 5 
        });

        // Redirect Detection
        const finalUrl = new URL(response.request.res.responseUrl);
        const finalHostname = finalUrl.hostname.replace('www.', '');
        if (!finalHostname.includes(domain.toLowerCase())) {
            return { ...result, status: 'REDIRECTED', remark: 'REDIRECTED', notes: `Lands on ${finalHostname}` };
        }

        // Content Cleaning 🧹
        let html = response.data.toString();
        const cleanText = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, ' ')
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, ' ')
            .replace(/<[^>]*>?/gm, ' ')
            .replace(/\s+/g, ' ').trim();

        const words = cleanText.split(' ').filter(w => w.length > 1);
        if (words.length < 50) return { ...result, status: 'NO_CONTENT', remark: 'NO_CONTENT', notes: `Thin content (${words.length} words)` };

        return { ...result, status: 'ACTIVE', remark: 'ACTIVE', notes: 'Valid site with content' };
    } catch (error) {
        return { ...result, status: 'DOWN', remark: 'DOWN', notes: 'Connection Error' };
    }
}
