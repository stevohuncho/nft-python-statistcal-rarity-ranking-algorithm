import fs from 'fs'
import toml from 'toml'
import { grabMetadata } from './modules/metadata'
import { PythonShell } from 'python-shell'
import { parse } from 'csv-parse/sync'

var main = async () => {
    let slug: string = "azuki"
    slug = slug.toLowerCase()

    let metadataGenerator = grabMetadata(slug, "ENTER YOUR ETHERSCAN API KEY")
    for await (let genStatus of metadataGenerator) {
        if (typeof genStatus == 'object') {
            console.log(genStatus[0])
            var metadata = genStatus[1]
            fs.writeFileSync('./metadata/metadata.json',JSON.stringify(metadata))
        } else {
            console.log(genStatus)
        }
    }

    // rank nfts
    var rankings:any = []
    PythonShell.run(`${process.env.npm_config_local_prefix}//src//modules//rarityToolsV1Sort.py`, undefined, function (err:any, results:any) {
        if (err) throw err;
        rankings.push(JSON.parse(results[0]))
    });
    var resultStatus = false
    while(!resultStatus) {
        if (rankings.length > 0) {
            resultStatus = true
            rankings = rankings[0]
        } else {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    console.log("Done", new Date())
    var topTenList:string[] = []
    for (let i = 0; i < Object.keys(rankings).length; i++) {
        let token:any = Object.keys(rankings)[i]
        if (rankings[token].rank < Math.floor(Object.keys(rankings).length / 10)) {
            topTenList.push(token)
        }
    }
    console.log(rankings)
}

    
main()

  