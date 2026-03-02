import { computeScoresForMatch, isBetLocked } from '@/lib/scoring';

describe('Scoring Engine', () => {
    describe('computeScoresForMatch', () => {
        const baseBet = {
            id: 1,
            userId: 1,
            matchId: 1,
        };

        it('awards 1 point for correct outcome (draw)', () => {
            const bets = [{ ...baseBet, predictedOutcome: 'draw', predictedWinner: null }];
            const match = { id: 1, resultCode: 'draw' };
            const scores = computeScoresForMatch(bets, match);

            expect(scores[0].outcomePoints).toBe(1);
            expect(scores[0].winnerPoints).toBe(0);
            expect(scores[0].totalPoints).toBe(1);
        });

        it('awards 0 points for incorrect outcome', () => {
            const bets = [{ ...baseBet, predictedOutcome: 'white_win', predictedWinner: 'white' }];
            const match = { id: 1, resultCode: 'black_win' };
            const scores = computeScoresForMatch(bets, match);

            expect(scores[0].outcomePoints).toBe(0);
            expect(scores[0].winnerPoints).toBe(0);
            expect(scores[0].totalPoints).toBe(0);
        });

        it('awards 3 points for correct outcome + correct winner (white_win)', () => {
            const bets = [{ ...baseBet, predictedOutcome: 'white_win', predictedWinner: 'white' }];
            const match = { id: 1, resultCode: 'white_win' };
            const scores = computeScoresForMatch(bets, match);

            expect(scores[0].outcomePoints).toBe(1);
            expect(scores[0].winnerPoints).toBe(2);
            expect(scores[0].totalPoints).toBe(3);
        });

        it('awards 3 points for correct outcome + correct winner (black_win)', () => {
            const bets = [{ ...baseBet, predictedOutcome: 'black_win', predictedWinner: 'black' }];
            const match = { id: 1, resultCode: 'black_win' };
            const scores = computeScoresForMatch(bets, match);

            expect(scores[0].outcomePoints).toBe(1);
            expect(scores[0].winnerPoints).toBe(2);
            expect(scores[0].totalPoints).toBe(3);
        });

        it('awards 1 point for correct outcome but wrong winner', () => {
            const bets = [{ ...baseBet, predictedOutcome: 'white_win', predictedWinner: 'black' }];
            const match = { id: 1, resultCode: 'white_win' };
            const scores = computeScoresForMatch(bets, match);

            expect(scores[0].outcomePoints).toBe(1);
            expect(scores[0].winnerPoints).toBe(0);
            expect(scores[0].totalPoints).toBe(1);
        });

        it('handles multiple bets correctly', () => {
            const bets = [
                { id: 1, userId: 1, matchId: 1, predictedOutcome: 'white_win', predictedWinner: 'white' },
                { id: 2, userId: 2, matchId: 1, predictedOutcome: 'draw', predictedWinner: null },
                { id: 3, userId: 3, matchId: 1, predictedOutcome: 'black_win', predictedWinner: 'black' },
            ];
            const match = { id: 1, resultCode: 'white_win' };
            const scores = computeScoresForMatch(bets, match);

            expect(scores[0].totalPoints).toBe(3); // correct outcome + winner
            expect(scores[1].totalPoints).toBe(0); // wrong outcome
            expect(scores[2].totalPoints).toBe(0); // wrong outcome
        });

        it('awards 1 point for draw prediction when result is draw', () => {
            const bets = [
                { id: 1, userId: 1, matchId: 1, predictedOutcome: 'draw', predictedWinner: null },
                { id: 2, userId: 2, matchId: 1, predictedOutcome: 'white_win', predictedWinner: 'white' },
            ];
            const match = { id: 1, resultCode: 'draw' };
            const scores = computeScoresForMatch(bets, match);

            expect(scores[0].totalPoints).toBe(1); // correct draw
            expect(scores[1].totalPoints).toBe(0); // wrong
        });
    });

    describe('isBetLocked', () => {
        it('returns false when more than 10 minutes before match', () => {
            const matchStart = new Date(Date.now() + 20 * 60 * 1000); // 20 min from now
            expect(isBetLocked(matchStart)).toBe(false);
        });

        it('returns true when exactly 10 minutes before match', () => {
            const matchStart = new Date(Date.now() + 10 * 60 * 1000); // exactly 10 min
            expect(isBetLocked(matchStart)).toBe(true);
        });

        it('returns true when less than 10 minutes before match', () => {
            const matchStart = new Date(Date.now() + 5 * 60 * 1000); // 5 min
            expect(isBetLocked(matchStart)).toBe(true);
        });

        it('returns true when match has started', () => {
            const matchStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
            expect(isBetLocked(matchStart)).toBe(true);
        });

        it('returns false when 11 minutes before match', () => {
            const matchStart = new Date(Date.now() + 11 * 60 * 1000);
            expect(isBetLocked(matchStart)).toBe(false);
        });

        it('uses custom now parameter', () => {
            const matchStart = new Date('2026-06-01T15:00:00Z');
            const nowBefore = new Date('2026-06-01T14:45:00Z'); // 15 min before
            const nowAfter = new Date('2026-06-01T14:55:00Z'); // 5 min before

            expect(isBetLocked(matchStart, nowBefore)).toBe(false);
            expect(isBetLocked(matchStart, nowAfter)).toBe(true);
        });
    });
});
