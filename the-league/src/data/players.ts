import { Player } from '../types/Player';

export const players: Player[] = [
  // NFL Players (2025-26 Season)
  // Starting Quarterbacks
  {
    id: 'lamar-jackson',
    name: 'Lamar Jackson',
    position: 'QB',
    team: 'Baltimore Ravens',
    league: 'NFL',
    stats: { passingYards: 3678, passingTDs: 24, rushingYards: 915, rushingTDs: 4 }
  },
  {
    id: 'josh-allen',
    name: 'Josh Allen',
    position: 'QB',
    team: 'Buffalo Bills',
    league: 'NFL',
    stats: { passingYards: 4306, passingTDs: 28, rushingYards: 531, rushingTDs: 15 }
  },
  {
    id: 'joe-burrow',
    name: 'Joe Burrow',
    position: 'QB',
    team: 'Cincinnati Bengals',
    league: 'NFL',
    stats: { passingYards: 4641, passingTDs: 43, rushingYards: 183, rushingTDs: 3 }
  },
  {
    id: 'jared-goff',
    name: 'Jared Goff',
    position: 'QB',
    team: 'Detroit Lions',
    league: 'NFL',
    stats: { passingYards: 4629, passingTDs: 37, rushingYards: 54, rushingTDs: 3 }
  },
  {
    id: 'sam-darnold',
    name: 'Sam Darnold',
    position: 'QB',
    team: 'Minnesota Vikings',
    league: 'NFL',
    stats: { passingYards: 4319, passingTDs: 35, rushingYards: 124, rushingTDs: 5 }
  },
  {
    id: 'baker-mayfield',
    name: 'Baker Mayfield',
    position: 'QB',
    team: 'Tampa Bay Buccaneers',
    league: 'NFL',
    stats: { passingYards: 4500, passingTDs: 41, rushingYards: 89, rushingTDs: 3 }
  },
  {
    id: 'jayden-daniels',
    name: 'Jayden Daniels',
    position: 'QB',
    team: 'Washington Commanders',
    league: 'NFL',
    stats: { passingYards: 3568, passingTDs: 25, rushingYards: 891, rushingTDs: 6 }
  },
  {
    id: 'patrick-mahomes',
    name: 'Patrick Mahomes',
    position: 'QB',
    team: 'Kansas City Chiefs',
    league: 'NFL',
    stats: { passingYards: 3928, passingTDs: 26, rushingYards: 117, rushingTDs: 6 }
  },
  {
    id: 'justin-herbert',
    name: 'Justin Herbert',
    position: 'QB',
    team: 'Los Angeles Chargers',
    league: 'NFL',
    stats: { passingYards: 3870, passingTDs: 23, rushingYards: 190, rushingTDs: 3 }
  },
  {
    id: 'geno-smith',
    name: 'Geno Smith',
    position: 'QB',
    team: 'Seattle Seahawks',
    league: 'NFL',
    stats: { passingYards: 3623, passingTDs: 15, rushingYards: 65, rushingTDs: 1 }
  },
  {
    id: 'dak-prescott',
    name: 'Dak Prescott',
    position: 'QB',
    team: 'Dallas Cowboys',
    league: 'NFL',
    stats: { passingYards: 1978, passingTDs: 11, rushingYards: 105, rushingTDs: 2 }
  },
  {
    id: 'tua-tagovailoa',
    name: 'Tua Tagovailoa',
    position: 'QB',
    team: 'Miami Dolphins',
    league: 'NFL',
    stats: { passingYards: 2867, passingTDs: 19, rushingYards: 37, rushingTDs: 0 }
  },
  {
    id: 'jordan-love',
    name: 'Jordan Love',
    position: 'QB',
    team: 'Green Bay Packers',
    league: 'NFL',
    stats: { passingYards: 3389, passingTDs: 25, rushingYards: 247, rushingTDs: 2 }
  },
  {
    id: 'caleb-williams',
    name: 'Caleb Williams',
    position: 'QB',
    team: 'Chicago Bears',
    league: 'NFL',
    stats: { passingYards: 3541, passingTDs: 20, rushingYards: 489, rushingTDs: 3 }
  },
  {
    id: 'anthony-richardson',
    name: 'Anthony Richardson',
    position: 'QB',
    team: 'Indianapolis Colts',
    league: 'NFL',
    stats: { passingYards: 1814, passingTDs: 12, rushingYards: 468, rushingTDs: 4 }
  },
  {
    id: 'brock-purdy',
    name: 'Brock Purdy',
    position: 'QB',
    team: 'San Francisco 49ers',
    league: 'NFL',
    stats: { passingYards: 3864, passingTDs: 20, rushingYards: 40, rushingTDs: 2 }
  },

  // Running Backs
  {
    id: 'saquon-barkley',
    name: 'Saquon Barkley',
    position: 'RB',
    team: 'Philadelphia Eagles',
    league: 'NFL',
    stats: { rushingYards: 2005, rushingTDs: 13, receptions: 33, receivingYards: 278 }
  },
  {
    id: 'derrick-henry',
    name: 'Derrick Henry',
    position: 'RB',
    team: 'Baltimore Ravens',
    league: 'NFL',
    stats: { rushingYards: 1921, rushingTDs: 16, receptions: 11, receivingYards: 137 }
  },
  {
    id: 'bijan-robinson',
    name: 'Bijan Robinson',
    position: 'RB',
    team: 'Atlanta Falcons',
    league: 'NFL',
    stats: { rushingYards: 1456, rushingTDs: 14, receptions: 61, receivingYards: 431 }
  },
  {
    id: 'josh-jacobs',
    name: 'Josh Jacobs',
    position: 'RB',
    team: 'Green Bay Packers',
    league: 'NFL',
    stats: { rushingYards: 1329, rushingTDs: 15, receptions: 36, receivingYards: 342 }
  },
  {
    id: 'jahmyr-gibbs',
    name: 'Jahmyr Gibbs',
    position: 'RB',
    team: 'Detroit Lions',
    league: 'NFL',
    stats: { rushingYards: 1412, rushingTDs: 16, receptions: 52, receivingYards: 517 }
  },
  {
    id: 'christian-mccaffrey',
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'San Francisco 49ers',
    league: 'NFL',
    stats: { rushingYards: 988, rushingTDs: 8, receptions: 31, receivingYards: 202 }
  },
  {
    id: 'alvin-kamara',
    name: 'Alvin Kamara',
    position: 'RB',
    team: 'New Orleans Saints',
    league: 'NFL',
    stats: { rushingYards: 1055, rushingTDs: 6, receptions: 54, receivingYards: 313 }
  },
  {
    id: 'kenneth-walker',
    name: 'Kenneth Walker III',
    position: 'RB',
    team: 'Seattle Seahawks',
    league: 'NFL',
    stats: { rushingYards: 1204, rushingTDs: 12, receptions: 23, receivingYards: 193 }
  },
  {
    id: 'de-von-achane',
    name: "De'Von Achane",
    position: 'RB',
    team: 'Miami Dolphins',
    league: 'NFL',
    stats: { rushingYards: 907, rushingTDs: 6, receptions: 59, receivingYards: 592 }
  },
  {
    id: 'aaron-jones',
    name: 'Aaron Jones',
    position: 'RB',
    team: 'Minnesota Vikings',
    league: 'NFL',
    stats: { rushingYards: 1138, rushingTDs: 5, receptions: 51, receivingYards: 408 }
  },

  // Wide Receivers
  {
    id: 'jamarr-chase',
    name: "Ja'Marr Chase",
    position: 'WR',
    team: 'Cincinnati Bengals',
    league: 'NFL',
    stats: { receptions: 117, receivingYards: 1708, receivingTDs: 16 }
  },
  {
    id: 'justin-jefferson',
    name: 'Justin Jefferson',
    position: 'WR',
    team: 'Minnesota Vikings',
    league: 'NFL',
    stats: { receptions: 103, receivingYards: 1533, receivingTDs: 10 }
  },
  {
    id: 'ceedee-lamb',
    name: 'CeeDee Lamb',
    position: 'WR',
    team: 'Dallas Cowboys',
    league: 'NFL',
    stats: { receptions: 101, receivingYards: 1194, receivingTDs: 6 }
  },
  {
    id: 'tyreek-hill',
    name: 'Tyreek Hill',
    position: 'WR',
    team: 'Miami Dolphins',
    league: 'NFL',
    stats: { receptions: 81, receivingYards: 959, receivingTDs: 6 }
  },
  {
    id: 'amon-ra-st-brown',
    name: 'Amon-Ra St. Brown',
    position: 'WR',
    team: 'Detroit Lions',
    league: 'NFL',
    stats: { receptions: 108, receivingYards: 1263, receivingTDs: 12 }
  },
  {
    id: 'aj-brown',
    name: 'A.J. Brown',
    position: 'WR',
    team: 'Philadelphia Eagles',
    league: 'NFL',
    stats: { receptions: 67, receivingYards: 1079, receivingTDs: 7 }
  },
  {
    id: 'mike-evans',
    name: 'Mike Evans',
    position: 'WR',
    team: 'Tampa Bay Buccaneers',
    league: 'NFL',
    stats: { receptions: 79, receivingYards: 1004, receivingTDs: 10 }
  },
  {
    id: 'cooper-kupp',
    name: 'Cooper Kupp',
    position: 'WR',
    team: 'Los Angeles Rams',
    league: 'NFL',
    stats: { receptions: 67, receivingYards: 710, receivingTDs: 5 }
  },
  {
    id: 'davante-adams',
    name: 'Davante Adams',
    position: 'WR',
    team: 'New York Jets',
    league: 'NFL',
    stats: { receptions: 84, receivingYards: 1124, receivingTDs: 9 }
  },
  {
    id: 'terry-mclaurin',
    name: 'Terry McLaurin',
    position: 'WR',
    team: 'Washington Commanders',
    league: 'NFL',
    stats: { receptions: 82, receivingYards: 1096, receivingTDs: 13 }
  },

  // Tight Ends
  {
    id: 'brock-bowers',
    name: 'Brock Bowers',
    position: 'TE',
    team: 'Las Vegas Raiders',
    league: 'NFL',
    stats: { receptions: 112, receivingYards: 1194, receivingTDs: 5 }
  },
  {
    id: 'travis-kelce',
    name: 'Travis Kelce',
    position: 'TE',
    team: 'Kansas City Chiefs',
    league: 'NFL',
    stats: { receptions: 97, receivingYards: 823, receivingTDs: 3 }
  },
  {
    id: 'george-kittle',
    name: 'George Kittle',
    position: 'TE',
    team: 'San Francisco 49ers',
    league: 'NFL',
    stats: { receptions: 67, receivingYards: 1106, receivingTDs: 8 }
  },
  {
    id: 'trey-mcbride',
    name: 'Trey McBride',
    position: 'TE',
    team: 'Arizona Cardinals',
    league: 'NFL',
    stats: { receptions: 96, receivingYards: 1146, receivingTDs: 1 }
  },
  {
    id: 'tj-hockenson',
    name: 'T.J. Hockenson',
    position: 'TE',
    team: 'Minnesota Vikings',
    league: 'NFL',
    stats: { receptions: 63, receivingYards: 494, receivingTDs: 4 }
  },
  {
    id: 'mark-andrews',
    name: 'Mark Andrews',
    position: 'TE',
    team: 'Baltimore Ravens',
    league: 'NFL',
    stats: { receptions: 55, receivingYards: 673, receivingTDs: 11 }
  },
  
  // Additional 2025-26 Season Players
  {
    id: 'patrick-mahomes',
    name: 'Patrick Mahomes',
    position: 'QB',
    team: 'Kansas City Chiefs',
    league: 'NFL',
    stats: { passingYards: 3928, passingTDs: 26, rushingYards: 331, rushingTDs: 6 }
  },
  {
    id: 'kyler-murray',
    name: 'Kyler Murray',
    position: 'QB',
    team: 'Arizona Cardinals',
    league: 'NFL',
    stats: { passingYards: 3836, passingTDs: 23, rushingYards: 568, rushingTDs: 12 }
  },
  {
    id: 'brock-purdy',
    name: 'Brock Purdy',
    position: 'QB',
    team: 'San Francisco 49ers',
    league: 'NFL',
    stats: { passingYards: 3864, passingTDs: 20, rushingYards: 144, rushingTDs: 4 }
  },
  {
    id: 'justin-herbert',
    name: 'Justin Herbert',
    position: 'QB',
    team: 'Los Angeles Chargers',
    league: 'NFL',
    stats: { passingYards: 3870, passingTDs: 23, rushingYards: 190, rushingTDs: 1 }
  },
  {
    id: 'christian-mccaffrey',
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'San Francisco 49ers',
    league: 'NFL',
    stats: { rushingYards: 1459, rushingTDs: 8, receptions: 30, receivingYards: 231 }
  },
  {
    id: 'james-cook',
    name: 'James Cook',
    position: 'RB',
    team: 'Buffalo Bills',
    league: 'NFL',
    stats: { rushingYards: 1009, rushingTDs: 16, receptions: 27, receivingYards: 145 }
  },
  {
    id: 'aaron-jones',
    name: 'Aaron Jones',
    position: 'RB',
    team: 'Minnesota Vikings',
    league: 'NFL',
    stats: { rushingYards: 1138, rushingTDs: 5, receptions: 51, receivingYards: 408 }
  },
  {
    id: 'kenneth-walker',
    name: 'Kenneth Walker III',
    position: 'RB',
    team: 'Seattle Seahawks',
    league: 'NFL',
    stats: { rushingYards: 1196, rushingTDs: 12, receptions: 23, receivingYards: 174 }
  },
  {
    id: 'deebo-samuel',
    name: 'Deebo Samuel',
    position: 'WR',
    team: 'San Francisco 49ers',
    league: 'NFL',
    stats: { receptions: 54, receivingYards: 629, receivingTDs: 3 }
  },
  {
    id: 'dj-moore',
    name: 'DJ Moore',
    position: 'WR',
    team: 'Chicago Bears',
    league: 'NFL',
    stats: { receptions: 78, receivingYards: 846, receivingTDs: 1 }
  },
  {
    id: 'jaylen-waddle',
    name: 'Jaylen Waddle',
    position: 'WR',
    team: 'Miami Dolphins',
    league: 'NFL',
    stats: { receptions: 66, receivingYards: 618, receivingTDs: 2 }
  },
  {
    id: 'malik-nabers',
    name: 'Malik Nabers',
    position: 'WR',
    team: 'New York Giants',
    league: 'NFL',
    stats: { receptions: 109, receivingYards: 1204, receivingTDs: 7 }
  },
  {
    id: 'jordan-addison',
    name: 'Jordan Addison',
    position: 'WR',
    team: 'Minnesota Vikings',
    league: 'NFL',
    stats: { receptions: 56, receivingYards: 849, receivingTDs: 9 }
  },
  {
    id: 'jake-ferguson',
    name: 'Jake Ferguson',
    position: 'TE',
    team: 'Dallas Cowboys',
    league: 'NFL',
    stats: { receptions: 71, receivingYards: 739, receivingTDs: 3 }
  },
  {
    id: 'taysom-hill',
    name: 'Taysom Hill',
    position: 'TE',
    team: 'New Orleans Saints',
    league: 'NFL',
    stats: { receptions: 23, receivingYards: 291, receivingTDs: 4 }
  },

  // NBA Players (2024-25 Season)
  {
    id: 'giannis-antetokounmpo',
    name: 'Giannis Antetokounmpo',
    position: 'PF',
    team: 'Milwaukee Bucks',
    league: 'NBA',
    stats: { ppg: 32.7, rpg: 11.5, apg: 6.1, fg: '61.1%' }
  },
  {
    id: 'shai-gilgeous-alexander',
    name: 'Shai Gilgeous-Alexander',
    position: 'PG',
    team: 'Oklahoma City Thunder',
    league: 'NBA',
    stats: { ppg: 30.3, rpg: 5.5, apg: 6.2, fg: '51.8%' }
  },
  {
    id: 'nikola-jokic',
    name: 'Nikola Jokić',
    position: 'C',
    team: 'Denver Nuggets',
    league: 'NBA',
    stats: { ppg: 31.0, rpg: 13.0, apg: 9.9, fg: '56.3%' }
  },
  {
    id: 'lebron-james',
    name: 'LeBron James',
    position: 'SF',
    team: 'Los Angeles Lakers',
    league: 'NBA',
    stats: { ppg: 23.0, rpg: 8.0, apg: 9.1, fg: '54.0%' }
  },
  {
    id: 'stephen-curry',
    name: 'Stephen Curry',
    position: 'PG',
    team: 'Golden State Warriors',
    league: 'NBA',
    stats: { ppg: 22.4, rpg: 5.1, apg: 6.4, tp: '40.6%' }
  },
  {
    id: 'kevin-durant',
    name: 'Kevin Durant',
    position: 'PF',
    team: 'Phoenix Suns',
    league: 'NBA',
    stats: { ppg: 27.6, rpg: 6.6, apg: 5.0, fg: '52.3%' }
  },
  {
    id: 'jalen-brunson',
    name: 'Jalen Brunson',
    position: 'PG',
    team: 'New York Knicks',
    league: 'NBA',
    stats: { ppg: 25.0, rpg: 3.4, apg: 7.5, fg: '48.0%' }
  },
  {
    id: 'karl-anthony-towns',
    name: 'Karl-Anthony Towns',
    position: 'C',
    team: 'New York Knicks',
    league: 'NBA',
    stats: { ppg: 25.2, rpg: 13.9, apg: 3.3, tp: '44.3%' }
  },
  {
    id: 'victor-wembanyama',
    name: 'Victor Wembanyama',
    position: 'C',
    team: 'San Antonio Spurs',
    league: 'NBA',
    stats: { ppg: 25.2, rpg: 10.8, apg: 3.9, bpg: 3.7 }
  },
  {
    id: 'evan-mobley',
    name: 'Evan Mobley',
    position: 'PF',
    team: 'Cleveland Cavaliers',
    league: 'NBA',
    stats: { ppg: 18.4, rpg: 8.8, apg: 2.4, bpg: 1.4 }
  },
  {
    id: 'cade-cunningham',
    name: 'Cade Cunningham',
    position: 'PG',
    team: 'Detroit Pistons',
    league: 'NBA',
    stats: { ppg: 24.5, rpg: 6.5, apg: 9.4, fg: '45.6%' }
  },
  {
    id: 'tyler-herro',
    name: 'Tyler Herro',
    position: 'SG',
    team: 'Miami Heat',
    league: 'NBA',
    stats: { ppg: 24.0, rpg: 5.6, apg: 5.1, tp: '40.2%' }
  },
  {
    id: 'alperen-sengun',
    name: 'Alperen Şengün',
    position: 'C',
    team: 'Houston Rockets',
    league: 'NBA',
    stats: { ppg: 21.2, rpg: 10.3, apg: 5.0, fg: '47.3%' }
  },
  {
    id: 'anthony-davis',
    name: 'Anthony Davis',
    position: 'PF',
    team: 'Los Angeles Lakers',
    league: 'NBA',
    stats: { ppg: 26.0, rpg: 11.9, apg: 3.6, bpg: 2.0 }
  },
  {
    id: 'jayson-tatum',
    name: 'Jayson Tatum',
    position: 'SF',
    team: 'Boston Celtics',
    league: 'NBA',
    stats: { ppg: 28.4, rpg: 8.6, apg: 5.7, tp: '37.3%' }
  },
  {
    id: 'jaylen-brown',
    name: 'Jaylen Brown',
    position: 'SG',
    team: 'Boston Celtics',
    league: 'NBA',
    stats: { ppg: 25.7, rpg: 7.2, apg: 4.7, fg: '49.3%' }
  },
  {
    id: 'luka-doncic',
    name: 'Luka Dončić',
    position: 'PG',
    team: 'Dallas Mavericks',
    league: 'NBA',
    stats: { ppg: 28.1, rpg: 8.3, apg: 7.8, fg: '46.0%' }
  },
  {
    id: 'joel-embiid',
    name: 'Joel Embiid',
    position: 'C',
    team: 'Philadelphia 76ers',
    league: 'NBA',
    stats: { ppg: 23.0, rpg: 7.9, apg: 3.8, fg: '45.8%' }
  },
  {
    id: 'donovan-mitchell',
    name: 'Donovan Mitchell',
    position: 'SG',
    team: 'Cleveland Cavaliers',
    league: 'NBA',
    stats: { ppg: 23.0, rpg: 4.4, apg: 4.4, tp: '36.8%' }
  },
  {
    id: 'darius-garland',
    name: 'Darius Garland',
    position: 'PG',
    team: 'Cleveland Cavaliers',
    league: 'NBA',
    stats: { ppg: 20.5, rpg: 2.3, apg: 6.5, tp: '44.9%' }
  },

  // MLB Players (2024 Season)
  // American League Stars
  {
    id: 'aaron-judge',
    name: 'Aaron Judge',
    position: 'RF',
    team: 'New York Yankees',
    league: 'MLB',
    stats: { avg: '.322', hr: 58, rbi: 144, ops: '1.159' }
  },
  {
    id: 'juan-soto',
    name: 'Juan Soto',
    position: 'LF',
    team: 'New York Yankees',
    league: 'MLB',
    stats: { avg: '.288', hr: 41, rbi: 109, ops: '.989' }
  },
  {
    id: 'vladimir-guerrero-jr',
    name: 'Vladimir Guerrero Jr.',
    position: '1B',
    team: 'Toronto Blue Jays',
    league: 'MLB',
    stats: { avg: '.323', hr: 30, rbi: 103, ops: '.935' }
  },
  {
    id: 'jose-altuve',
    name: 'José Altuve',
    position: '2B',
    team: 'Houston Astros',
    league: 'MLB',
    stats: { avg: '.295', hr: 20, rbi: 65, sb: 22 }
  },
  {
    id: 'yordan-alvarez',
    name: 'Yordan Alvarez',
    position: 'DH',
    team: 'Houston Astros',
    league: 'MLB',
    stats: { avg: '.308', hr: 35, rbi: 86, ops: '.972' }
  },
  {
    id: 'corey-seager',
    name: 'Corey Seager',
    position: 'SS',
    team: 'Texas Rangers',
    league: 'MLB',
    stats: { avg: '.278', hr: 30, rbi: 74, ops: '.869' }
  },
  {
    id: 'adley-rutschman',
    name: 'Adley Rutschman',
    position: 'C',
    team: 'Baltimore Orioles',
    league: 'MLB',
    stats: { avg: '.250', hr: 19, rbi: 80, ops: '.721' }
  },
  {
    id: 'gunnar-henderson',
    name: 'Gunnar Henderson',
    position: 'SS',
    team: 'Baltimore Orioles',
    league: 'MLB',
    stats: { avg: '.281', hr: 37, rbi: 92, sb: 22 }
  },
  {
    id: 'bobby-witt-jr',
    name: 'Bobby Witt Jr.',
    position: 'SS',
    team: 'Kansas City Royals',
    league: 'MLB',
    stats: { avg: '.332', hr: 32, rbi: 109, sb: 31 }
  },

  // National League Stars  
  {
    id: 'shohei-ohtani',
    name: 'Shohei Ohtani',
    position: 'DH',
    team: 'Los Angeles Dodgers',
    league: 'MLB',
    stats: { avg: '.310', hr: 54, rbi: 130, sb: 59 }
  },
  {
    id: 'mookie-betts',
    name: 'Mookie Betts',
    position: 'RF',
    team: 'Los Angeles Dodgers',
    league: 'MLB',
    stats: { avg: '.289', hr: 19, rbi: 75, sb: 16 }
  },
  {
    id: 'freddie-freeman',
    name: 'Freddie Freeman',
    position: '1B',
    team: 'Los Angeles Dodgers',
    league: 'MLB',
    stats: { avg: '.282', hr: 22, rbi: 89, ops: '.857' }
  },
  {
    id: 'ronald-acuna-jr',
    name: 'Ronald Acuña Jr.',
    position: 'RF',
    team: 'Atlanta Braves',
    league: 'MLB',
    stats: { avg: '.250', hr: 18, rbi: 44, sb: 16 }
  },
  {
    id: 'francisco-lindor',
    name: 'Francisco Lindor',
    position: 'SS',
    team: 'New York Mets',
    league: 'MLB',
    stats: { avg: '.273', hr: 33, rbi: 91, ops: '.844' }
  },
  {
    id: 'pete-alonso',
    name: 'Pete Alonso',
    position: '1B',
    team: 'New York Mets',
    league: 'MLB',
    stats: { avg: '.240', hr: 34, rbi: 88, ops: '.788' }
  },
  {
    id: 'manny-machado',
    name: 'Manny Machado',
    position: '3B',
    team: 'San Diego Padres',
    league: 'MLB',
    stats: { avg: '.275', hr: 29, rbi: 105, ops: '.821' }
  },
  {
    id: 'christian-yelich',
    name: 'Christian Yelich',
    position: 'LF',
    team: 'Milwaukee Brewers',
    league: 'MLB',
    stats: { avg: '.315', hr: 11, rbi: 42, sb: 21 }
  },
  {
    id: 'ketel-marte',
    name: 'Ketel Marte',
    position: '2B',
    team: 'Arizona Diamondbacks',
    league: 'MLB',
    stats: { avg: '.292', hr: 36, rbi: 95, ops: '.890' }
  },

  // Top Pitchers
  {
    id: 'tarik-skubal',
    name: 'Tarik Skubal',
    position: 'SP',
    team: 'Detroit Tigers',
    league: 'MLB',
    stats: { wins: 18, era: '2.39', so: 228, whip: '0.92' }
  },
  {
    id: 'chris-sale',
    name: 'Chris Sale',
    position: 'SP',
    team: 'Atlanta Braves',
    league: 'MLB',
    stats: { wins: 18, era: '2.38', so: 225, whip: '1.01' }
  },
  {
    id: 'corbin-burnes',
    name: 'Corbin Burnes',
    position: 'SP',
    team: 'Baltimore Orioles',
    league: 'MLB',
    stats: { wins: 15, era: '2.92', so: 181, whip: '1.10' }
  },
  {
    id: 'seth-lugo',
    name: 'Seth Lugo',
    position: 'SP',
    team: 'Kansas City Royals',
    league: 'MLB',
    stats: { wins: 16, era: '3.00', so: 181, whip: '1.09' }
  },
  {
    id: 'emmanuel-clase',
    name: 'Emmanuel Clase',
    position: 'CP',
    team: 'Cleveland Guardians',
    league: 'MLB',
    stats: { saves: 47, era: '0.61', so: 66, whip: '0.66' }
  },
  {
    id: 'gerrit-cole',
    name: 'Gerrit Cole',
    position: 'SP',
    team: 'New York Yankees',
    league: 'MLB',
    stats: { wins: 8, era: '3.41', so: 99, whip: '1.13' }
  },
  {
    id: 'zack-wheeler',
    name: 'Zack Wheeler',
    position: 'SP',
    team: 'Philadelphia Phillies',
    league: 'MLB',
    stats: { wins: 16, era: '2.57', so: 224, whip: '0.96' }
  },
  {
    id: 'spencer-strider',
    name: 'Spencer Strider',
    position: 'SP',
    team: 'Atlanta Braves',
    league: 'MLB',
    stats: { wins: 0, era: '0.00', so: 0, whip: '0.00' }
  }
];