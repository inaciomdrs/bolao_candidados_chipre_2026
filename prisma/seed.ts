import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create manager user
    const managerPassword = await bcrypt.hash('Manager123', 12);
    const manager = await prisma.user.upsert({
        where: { email: 'gerente@bolao.com' },
        update: {},
        create: {
            email: 'gerente@bolao.com',
            name: 'Gerente do Bolão',
            role: 'gerente',
            passwordHash: managerPassword,
            isActive: true,
        },
    });
    console.log(`  ✅ Manager: ${manager.email} (senha: Manager123)`);

    // Create player users
    const playerPassword = await bcrypt.hash('Jogador123', 12);
    const players = [
        { email: 'jogador1@bolao.com', name: 'João Silva' },
        { email: 'jogador2@bolao.com', name: 'Maria Santos' },
        { email: 'jogador3@bolao.com', name: 'Pedro Oliveira' },
    ];

    for (const p of players) {
        const user = await prisma.user.upsert({
            where: { email: p.email },
            update: {},
            create: {
                email: p.email,
                name: p.name,
                role: 'boleiro',
                passwordHash: playerPassword,
                isActive: true,
            },
        });
        console.log(`  ✅ Player: ${user.email} (senha: Jogador123)`);
    }

    // Create a championship
    const championship = await prisma.championship.upsert({
        where: { slug: 'candidates-2026' },
        update: {},
        create: {
            name: 'Candidates Tournament 2026',
            slug: 'candidates-2026',
            timezone: 'America/Sao_Paulo',
            description: 'Torneio de Candidatos de Xadrez FIDE 2026',
            createdById: manager.id,
        },
    });
    console.log(`  ✅ Championship: ${championship.name}`);

    // Create rounds
    const roundNames = ['Rodada 1', 'Rodada 2', 'Rodada 3'];
    const rounds = [];
    for (let i = 0; i < roundNames.length; i++) {
        const round = await prisma.round.create({
            data: {
                championshipId: championship.id,
                name: roundNames[i],
                roundNumber: i + 1,
                order: i + 1,
            },
        });
        rounds.push(round);
        console.log(`  ✅ Round: ${round.name}`);
    }

    // Create sample matches
    const chessPlayers = [
        ['Gukesh D', 'Fabiano Caruana'],
        ['Hikaru Nakamura', 'Praggnanandhaa R'],
        ['Alireza Firouzja', 'Ian Nepomniachtchi'],
        ['Wei Yi', 'Nodirbek Abdusattorov'],
    ];

    const baseDate = new Date('2026-06-15T14:00:00Z');
    let matchIndex = 0;

    for (let r = 0; r < rounds.length && matchIndex < chessPlayers.length; r++) {
        const pairingsThisRound = r < 2 ? 2 : 1;
        for (let p = 0; p < pairingsThisRound && matchIndex < chessPlayers.length; p++) {
            const [white, black] = chessPlayers[matchIndex];
            const startDate = new Date(baseDate.getTime() + matchIndex * 24 * 60 * 60 * 1000);

            const match = await prisma.match.create({
                data: {
                    championshipId: championship.id,
                    roundId: rounds[r].id,
                    playerWhite: white,
                    playerBlack: black,
                    startDatetime: startDate,
                    status: 'scheduled',
                },
            });
            console.log(`  ✅ Match: ${white} vs ${black} (${startDate.toISOString()})`);
            matchIndex++;
        }
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('\nTest accounts:');
    console.log('  Manager: gerente@bolao.com / Manager123');
    console.log('  Player:  jogador1@bolao.com / Jogador123');
    console.log('  Player:  jogador2@bolao.com / Jogador123');
    console.log('  Player:  jogador3@bolao.com / Jogador123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
