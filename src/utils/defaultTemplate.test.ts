import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultTemplate,
  parseDefaultTemplateJson,
  restoreStateFromDefaultTemplate,
} from './defaultTemplate';
import { AppState } from '../types/badminton';

function makeSampleState(): AppState {
  return {
    activeClubId: 'club_pb_noz',
    clubs: [
      {
        id: 'club_pb_noz',
        name: 'PB Noz',
        sequenceCounter: 5,
        settings: {
          matchingMode: 'level',
          genderMatching: 'same_or_mixed',
          sameGenderPercent: 70,
          queueMode: 'split',
          genderStyle: 'thin_edge',
        },
        courts: [
          {
            id: 'c1',
            number: 1,
            name: 'Lapangan 1',
            status: 'playing',
            lineup: { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
            pinnedPlayerIds: ['p1'],
            startedAt: 123456,
          },
          {
            id: 'c2',
            number: 2,
            name: 'Lapangan 2',
            status: 'open',
            lineup: { teamA: [null, null], teamB: [null, null] },
            pinnedPlayerIds: [],
            startedAt: null,
          },
        ],
        players: [
          { id: 'p1', name: 'Budi', gender: 'M', level: 3, isActive: true, assignedCourtId: 'c1', matchesPlayed: 3, lastPlayedAt: 4 },
          { id: 'p2', name: 'Andi', gender: 'M', level: 2, isActive: true, assignedCourtId: 'c1', matchesPlayed: 2, lastPlayedAt: 3 },
          { id: 'p3', name: 'Sari', gender: 'F', level: 3, isActive: true, assignedCourtId: 'c1', matchesPlayed: 2, lastPlayedAt: 2 },
          { id: 'p4', name: 'Dewi', gender: 'F', level: 1, isActive: true, assignedCourtId: 'c1', matchesPlayed: 1, lastPlayedAt: 1 },
          { id: 'p5', name: 'Eko', gender: 'M', level: 2, isActive: false, assignedCourtId: 'c2', matchesPlayed: 1, lastPlayedAt: 1 },
        ],
        records: [
          {
            id: 'rec_1',
            courtId: 'c1',
            courtNumber: 1,
            courtName: 'Lapangan 1',
            teamA: ['p1', 'p2'],
            teamB: ['p3', 'p4'],
            timestamp: 1000,
          },
        ],
      },
    ],
  };
}

test('createDefaultTemplate preserves all players and settings while resetting session match logs', () => {
  const state = makeSampleState();
  const template = createDefaultTemplate(state, 9999);

  assert.equal(template.version, 1);
  assert.equal(template.savedAt, 9999);
  const club = template.state.clubs[0];
  assert.equal(club.name, 'PB Noz');
  assert.equal(club.players.length, 5);
  assert.equal(club.courts.length, 2);
  assert.equal(club.records.length, 0);
  assert.equal(club.sequenceCounter, 0);
  assert.deepEqual(club.settings, state.clubs[0].settings);
  assert.equal(club.courts[0].status, 'open');
  assert.equal(club.players[4].isActive, false);
  assert.ok(club.players.every((p) => p.matchesPlayed === 0));
});

test('parseDefaultTemplateJson validates and restores default template cleanly', () => {
  const state = makeSampleState();
  const template = createDefaultTemplate(state, 5000);
  const raw = JSON.stringify(template);

  const parsed = parseDefaultTemplateJson(raw);
  assert.ok(parsed);
  assert.equal(parsed.savedAt, 5000);

  const restored = restoreStateFromDefaultTemplate(parsed);
  assert.equal(restored.clubs[0].players.length, 5);
  assert.equal(restored.clubs[0].settings.sameGenderPercent, 70);
  assert.equal(restored.clubs[0].settings.genderMatching, 'same_or_mixed');
  assert.equal(restored.clubs[0].courts[0].lineup.teamA[0], 'p1');

  assert.equal(parseDefaultTemplateJson('invalid json'), null);
  assert.equal(parseDefaultTemplateJson('{"clubs":[]}'), null);
});

test('createDefaultTemplate preserves valid playerGroups and filters invalid references', () => {
  const state = makeSampleState();
  state.clubs[0].playerGroups = [
    { id: 'g1', mode: 'same_team', playerIds: ['p1', 'p2'], courtId: null, createdAt: 100 },
    { id: 'g2', mode: 'same_court', playerIds: ['p3', 'p4', 'missing_p'], courtId: 'c2', createdAt: 200 },
    { id: 'g3', mode: 'same_team', playerIds: ['p1', 'missing_p'], courtId: null, createdAt: 300 },
  ];

  const template = createDefaultTemplate(state, 7000);
  const restored = restoreStateFromDefaultTemplate(template);
  const groups = restored.clubs[0].playerGroups ?? [];
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].playerIds, ['p1', 'p2']);
  assert.deepEqual(groups[1].playerIds, ['p3', 'p4']);
  assert.equal(groups[1].courtId, 'c2');
});

