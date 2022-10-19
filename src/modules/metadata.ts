import got from 'got'
import { Link, Metadata } from '../types'
import Web3 from 'web3'


// main flow
export async function* grabMetadata(slug:string, apikey: string) {
    let linksStatus = false
    while (!linksStatus) {
        var ipfsLinks:any = await grabLinksContract(slug, apikey)
        if (ipfsLinks !== undefined) {
            linksStatus = true
            yield "Got IPFS Links" 
        } else {
            yield "Links Not Ready"
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    // Monitor Collection Metadata
    await monitor(ipfsLinks)
    // Run HTTP Requests to Poll Metadata
    var metadata: Metadata[] = []
    for (let i = 0; i < ipfsLinks.length; i++) {     
        pollMetadata(ipfsLinks[i], metadata)
    }

    // Loop that runs until Metadata List is complete
    var metadataStatus = false
    while (!metadataStatus) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (metadata.length == ipfsLinks.length) {
            yield ['Metadata Completed', metadata]
            metadataStatus = true
        } else {
            yield `Metadata Incomplete ${metadata.length} Files Collected :: Waiting 1 Second`
        }
    }
}

export async function monitor(ipfsLinks:any) {
    let liveStatus = false
    while (!liveStatus) {
        // get first token metadata
        try {
            let res:any = await got(ipfsLinks[0].link, {
                retry: 3,
                timeout: {
                    request: 10000
                }
            }).json()
            // initial tests
            if (!JSON.stringify(res).includes('attributes')) {
                console.log('metadata not loaded')
            } else if (res.attributes.length === 0) {
                console.log('metadata not loaded')
            } else if (!JSON.stringify(res.attributes).includes('trait_type') && !JSON.stringify(res.attributes).includes('value')) {
                console.log('incorrect metadata format')
            } else {
                var firstMetadata = res.attributes
            }
        } catch (e) {
            console.log(`request timeout/error ${e}`)
        }
        // compare to second token to make sure its not all the same preloaded metadata
        try {
            let res:any = await got(ipfsLinks[1].link, {
                retry: 3,
                timeout: {
                    request: 10000
                }
            }).json()
            // initial tests
            if (!JSON.stringify(res).includes('attributes')) {
                console.log('metadata not loaded on 2nd')
            } else if (res.attributes.length === 0) {
                console.log('metadata not loaded on 2nd')
            } else if (!JSON.stringify(res.attributes).includes('trait_type') && !JSON.stringify(res.attributes).includes('value')) {
                console.log('incorrect metadata format on 2nd')
            } else {
                var secondMetadata = res.attributes
            }
        } catch (e) {
            console.log(`request timeout/error ${e} on 2nd`)
        }
        console.log(JSON.stringify(firstMetadata))
        console.log(JSON.stringify(secondMetadata))
        if (JSON.stringify(firstMetadata) == JSON.stringify(secondMetadata)) {
            console.log(`live metadata not loaded on both`, new Date())
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            console.log(`metadata live!`, new Date())
            liveStatus = true
        }
    }
    return 'Loaded'
}

// util funcs
async function pollMetadata(ipfsLinks:any,metadata: Metadata[]) {
    var metadataStatus = false
    while (!metadataStatus) {
        try {  
            var res:any = await got(ipfsLinks.link, {
                retry: 3,
                timeout: {
                    request: 10000
                },
            }).text()
            if (res.includes('attributes')) {
                metadata.push({traits:JSON.parse(res).attributes, token:ipfsLinks.token })
                metadataStatus = true
            } else {
                console.log("Didnt Include Attributes")
                console.log(res)
            }
        } catch (e) {
            console.log(e)
            console.log("Timeout", ipfsLinks.link)
        }
    }
}



async function grabLinksContract(slug: string, apikey: string) {
    var contract!: string;
    var totalSupply!: number;
    var abi: any;

    try {
        let res: any = await got(`https://api.opensea.io/api/v1/collection/${slug}`).json()
        if (res.collection.primary_asset_contracts[0].schema_name != "ERC721") {
            throw new Error("Not ERC721");
        }
        totalSupply = res.collection.stats.total_supply
        contract = res.collection.primary_asset_contracts[0].address 
    } catch (e) {
        if (String(e).includes("ERR_NON_2XX_3XX_RESPONSE")) {
            console.log('Token DNE')
        }
        console.log(e)
    }

    try {
        let res: any = await got(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contract}&apikey=${apikey}`).json()
        abi = JSON.parse(res.result)
    } catch (e) {
        console.log(e)
    }
    console.log(abi)
    var tokenURI: boolean = false
    for (let i = 0; i < abi.length; i++) {
        if (abi[i].name == "tokenURI") {
            tokenURI = true
        }
    }
    if (!tokenURI) {
        throw new Error("No TokenURI Function");
    }

    let web3: any = new Web3('https://cloudflare-eth.com')
    let contractInstance: any = new web3.eth.Contract(abi, contract);
    var tokenURIStatus: boolean = false
    var tokenURIIndex: number = 0
    var tokenURIResult!: string;
    while (!tokenURIStatus) {
        try {
            tokenURIResult = await contractInstance.methods.tokenURI(tokenURIIndex).call()
            tokenURIStatus = true
        } catch (e) {
            if (String(e).includes("Returned error: execution reverted")) {
                console.log(`Token ${tokenURIIndex} DNE`)
                tokenURIIndex++
            } else {
                throw new Error("Unknown TokenURI Error");
            }
        }
    }

    let baseLink: string = tokenURIResult
    if (tokenURIResult.includes('ipfs://') && tokenURIResult.indexOf('ipfs://') == 0) {
        tokenURIResult = tokenURIResult.replace('ipfs://','')
        baseLink = `https://ipfs.io/ipfs/${tokenURIResult}`
    }
    baseLink.replace("//","/")
    let finalBackslashIndex: number = finalIndexOf(baseLink, /\//g)
    var links: Link[] = []
    var temp;
    for (let i = tokenURIIndex; i < (tokenURIIndex + totalSupply); i++) {
        let link = setCharAt(baseLink,finalBackslashIndex+1, i)
        if (temp !== link) {
            links.push({link: link, token: i})
        }
        temp = link
    }
    if (links.length !== totalSupply) {
        throw new Error("Problem With Gathering All Links");
        
    }
    console.log(links)
    return links
}

function finalIndexOf(string: string, regex: any): number {
    var match,
        indexes = [];

    regex = new RegExp(regex);

    while (match = regex.exec(string)) {
        indexes.push(match.index);
    }

    return indexes[indexes.length - 1];
}

function setCharAt(str:string,index:number,chr:any): string {
    if(index > str.length-1) return str;
    return str.substring(0,index) + chr + str.substring(index+1);
}
