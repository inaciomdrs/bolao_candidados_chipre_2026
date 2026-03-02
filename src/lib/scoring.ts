/**
 * Scoring engine for the Bolão.
 *
 * Rules:
 * - Correct outcome (white_win/draw/black_win): +1 point
 * - If match has a winner (not draw) and user predicted the correct winning player: additional +2 points
 *   Max per bet: 3 points (1 outcome + 2 correct player)
 */

export interface BetForScoring {
    id: number;
    userId: number;
    matchId: number;
    predictedOutcome: string; // white_win | draw | black_win
    predictedWinner: string | null; // white | black | null
}

export interface MatchResult {
    id: number;
    resultCode: string; // white_win | draw | black_win
}

export interface ScoreResult {
    betId: number;
    userId: number;
    matchId: number;
    outcomePoints: number;
    winnerPoints: number;
    totalPoints: number;
}

/**
 * Compute scores for a list of bets against a match result.
 */
export function computeScoresForMatch(
    bets: BetForScoring[],
    match: MatchResult
): ScoreResult[] {
    return bets.map((bet) => {
        let outcomePoints = 0;
        let winnerPoints = 0;

        // Check if outcome prediction is correct
        if (bet.predictedOutcome === match.resultCode) {
            outcomePoints = 1;

            // If the match had a winner (not a draw), check for correct player prediction
            if (match.resultCode !== 'draw' && bet.predictedWinner) {
                const actualWinner = match.resultCode === 'white_win' ? 'white' : 'black';
                if (bet.predictedWinner === actualWinner) {
                    winnerPoints = 2;
                }
            }
        }

        return {
            betId: bet.id,
            userId: bet.userId,
            matchId: match.id,
            outcomePoints,
            winnerPoints,
            totalPoints: outcomePoints + winnerPoints,
        };
    });
}

/**
 * Check if a bet is within the lock window (10 minutes before match start).
 */
export function isBetLocked(matchStartDatetime: Date, now?: Date): boolean {
    const currentTime = now || new Date();
    const lockTime = new Date(matchStartDatetime.getTime() - 10 * 60 * 1000);
    return currentTime >= lockTime;
}
