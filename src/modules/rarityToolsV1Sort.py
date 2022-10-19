import json
metadata = json.load(open('metadata\metadata.json'))

def sort(metadata):
    # get all values of traits and trait counts
    traitCounts = {}
    totalTraitCounts = {}
    for data in metadata:
        traitsData = list({x['trait_type']:x for x in data['traits']}.values())
        for traitData in traitsData:
            if not traitData['trait_type'] in list(traitCounts.keys()):
                traitCounts[traitData['trait_type']] = {}
            if not traitData['value'] in list(traitCounts[traitData['trait_type']].keys()):
                traitCounts[traitData['trait_type']][traitData['value']] = 1
            else:
                traitCounts[traitData['trait_type']][traitData['value']] = traitCounts[traitData['trait_type']][traitData['value']] + 1
        if not len(traitsData) in totalTraitCounts:
            totalTraitCounts[len(traitsData)] = 1
        else:
            totalTraitCounts[len(traitsData)] = totalTraitCounts[len(traitsData)] + 1

    # add null counts
    for traitGroup in traitCounts:
        totalCount = 0
        for trait in traitCounts[traitGroup]:
            totalCount = totalCount + traitCounts[traitGroup][trait]
        nullCount = len(metadata) - totalCount
        if nullCount != 0:
            traitCounts[traitGroup]["null"] = nullCount

    # find multipliers
    multipliers = []
    finalMultipliers = {}
    for traitGroup in traitCounts:
        multipliers.append({"group": traitGroup, "count": len(traitCounts[traitGroup])})
    multipliers.append({"group": 'traitCounts', "count": len(totalTraitCounts)})
    multipliers.sort(key=lambda x: x["count"])
    for i, traitGroup in enumerate(multipliers):
        totalMult = 1
        for x in range((len(multipliers) - i - 1)):
            multiplier = multipliers[len(multipliers) - x - 1]['count'] / multipliers[len(multipliers) - x - 2]['count']
            totalMult = totalMult * multiplier
        finalMultipliers[multipliers[i]['group']] = round(totalMult,4)

    # transform scores into rarity.tools V1 percetnages
    traitPercentages = traitCounts
    totalTraitPercentages = totalTraitCounts
    for traitGroup in traitCounts:
        for trait in traitCounts[traitGroup]:
            percentage = traitCounts[traitGroup][trait] / len(metadata)
            inversePercentage = 1 / percentage
            traitPercentages[traitGroup][trait] = round(inversePercentage,2)
    for count in totalTraitCounts:
        percentage = totalTraitCounts[count] / len(metadata)
        inversePercentage = 1 / percentage
        totalTraitPercentages[count] = round(inversePercentage,2)
    
    # add up scores for nfts
    rankings = []
    for data in metadata:
        traitsData = list({x['trait_type']:x for x in data['traits']}.values())
        totalScore = 0 
        traits = []
        scores = []
        traitTypes = []
        nullTypes = []
        for trait in traitsData:
            scores.append(traitPercentages[trait['trait_type']][trait['value']]  * finalMultipliers[trait['trait_type']])
            traitTypes.append(trait['trait_type'])
            traits.append({
                'trait_type': trait['trait_type'], 
                'value': trait['value'],
                'score': round(traitPercentages[trait['trait_type']][trait['value']]  * finalMultipliers[trait['trait_type']],2)
            })
        for cat in traitPercentages.keys():
            if not cat in traitTypes:
                nullTypes.append(cat)
        for cat in nullTypes:
            scores.append(traitPercentages[cat]['null'] * finalMultipliers[cat])
            traits.append({
                'trait_type': cat, 
                'value': 'null',
                'score': round(traitPercentages[cat]['null'] * finalMultipliers[cat],2)
            })
        scores.append(totalTraitPercentages[len(traitsData)] * finalMultipliers['traitCounts'])
        traits.append({
            'trait_type': 'trait count', 
            'value': len(traitsData),
            'score': round(totalTraitPercentages[len(traitsData)] * finalMultipliers['traitCounts'],2)
        })
        scores.sort()
        traits.sort(key=lambda x: x["score"], reverse=True)
        for score in scores:
            totalScore = totalScore + score
        rankings.append({"score": round(totalScore,2), "token": data['token'], "traits": traits})
    rankings.sort(key=lambda x: x["score"], reverse=True)
    finalRankings = {}
    rankMap = []
    rankCount = 0
    for i, rank in enumerate(rankings):
        rankCount = rankCount + 1
        if i == 0:
            finalRankings[rank['token']] = {
                "rank": rankCount,
                "traits": rank['traits'],
                "overallScore": rank['score']
            }
            rankMap.append({"token": rank['token'], "rank": rankCount})
            currentRank = rankCount
        else:
            if rank['score'] != tempScore:
                finalRankings[rank['token']] = {
                    "rank": rankCount,
                    "traits": rank['traits'],
                    "overallScore": rank['score']
                }
                rankMap.append({"token": rank['token'], "rank": rankCount})
                currentRank = rankCount
            else:
                finalRankings[rank['token']] = {
                    "rank": currentRank,
                    "traits": rank['traits'],
                    "overallScore": rank['score']
                }
                rankMap.append({"token": rank['token'], "rank": currentRank})
                currentRank = rankCount
        tempScore = rank['score']  
    print(json.dumps(finalRankings))




sort(metadata)



     



    
    






        