const fs = require('fs');
const https = require('https');

const API_KEY = process.env.FCB_API_KEY; // Secret from GitHub Actions
const TEAM_ID = 81; // FC Barcelona
const URL = `https://api.football-data.org/v4/teams/${TEAM_ID}/matches?status=FINISHED&limit=1`;

if (!API_KEY) {
    console.error("Error: FCB_API_KEY is missing.");
    process.exit(1);
}

const options = {
    headers: { 'X-Auth-Token': API_KEY }
};

https.get(URL, options, (res) => {
    let data = '';

    res.on('data', (chunk) => { data += chunk; });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (!json.matches || json.matches.length === 0) {
                console.error("No matches found.");
                process.exit(0); // Don't fail, just don't update
            }

            const match = json.matches[0];
            const result = {
                competition: match.competition.name,
                date: match.utcDate.split('T')[0],
                status: match.status,
                homeTeam: {
                    name: match.homeTeam.shortName || match.homeTeam.name,
                    score: match.score.fullTime.home,
                    crest: match.homeTeam.crest
                },
                awayTeam: {
                    name: match.awayTeam.shortName || match.awayTeam.name,
                    score: match.score.fullTime.away,
                    crest: match.awayTeam.crest
                },
                winner: match.score.winner // HOME_TEAM, AWAY_TEAM, DRAW
            };

            // Save to public/scores.json
            fs.mkdirSync('public', { recursive: true });
            fs.writeFileSync('public/scores.json', JSON.stringify(result, null, 2));
            console.log("Updated scores.json successfully.");

        } catch (e) {
            console.error("Error parsing JSON:", e.message);
            process.exit(1);
        }
    });

}).on('error', (e) => {
    console.error("Network error:", e.message);
    process.exit(1);
});
