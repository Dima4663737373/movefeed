const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 'User-Agent': 'Node.js' }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    const repos = [
        "movementlabsxyz/movement",
        "movementlabsxyz/aptos-core"
    ];

    for (const repo of repos) {
        console.log(`Checking repo: ${repo}...`);
        try {
            const releases = await fetchJson(`https://api.github.com/repos/${repo}/releases`);
            if (releases.length > 0) {
                const rel = releases[0];
                console.log(`Release: ${rel.tag_name}`);
                if (rel.assets) {
                    for (const asset of rel.assets) {
                        console.log(`  ASSET: ${asset.name} -> ${asset.browser_download_url}`);
                    }
                }
            }
        } catch (e) {
            console.log(`Error checking ${repo}: ${e.message}`);
        }
    }
}

main();
