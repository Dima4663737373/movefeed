
/**
 * Explorer link generation helper
 */

export type ExplorerType = 'movement' | 'aptos';

export function getExplorerLink(
    value: string, 
    type: 'tx' | 'address' | 'block', 
    explorer: ExplorerType = 'movement'
): string {
    const network = '?network=bardock+testnet';
    
    // Official Movement Explorer
    if (explorer === 'movement') {
        const baseUrl = 'https://explorer.movementnetwork.xyz';
        switch (type) {
            case 'tx':
                return `${baseUrl}/txn/${value}${network}`;
            case 'address':
                return `${baseUrl}/account/${value}${network}`;
            case 'block':
                return `${baseUrl}/block/${value}${network}`;
            default:
                return baseUrl;
        }
    }
    
    // Aptos Scan (fallback/alternative)
    if (explorer === 'aptos') {
        const baseUrl = 'https://aptoscan.com';
        switch (type) {
            case 'tx':
                return `${baseUrl}/version/${value}${network}`; // AptosScan uses version for tx
            case 'address':
                return `${baseUrl}/account/${value}${network}`;
            case 'block':
                return `${baseUrl}/block/${value}${network}`;
            default:
                return baseUrl;
        }
    }

    return '#';
}
