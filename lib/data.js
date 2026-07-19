export const carriers = [
  { usdot: '1234567', mc: 'MC-456789', name: 'Example Transport LLC', state: 'IL', status: 'AUTHORIZED', rating: 4.2, safety: 'Satisfactory', powerUnits: 86, drivers: 104, pay: 4.5, dispatch: 3.9, equipment: 4.3, homeTime: 4.0 },
  { usdot: '2468013', mc: 'MC-810121', name: 'Midwest Dedicated Freight', state: 'WI', status: 'AUTHORIZED', rating: 3.8, safety: 'Not Rated', powerUnits: 42, drivers: 51, pay: 3.7, dispatch: 4.1, equipment: 3.8, homeTime: 3.9 },
  { usdot: '9753102', mc: 'MC-135791', name: 'Great Lakes Specialized', state: 'IN', status: 'AUTHORIZED', rating: 4.5, safety: 'Satisfactory', powerUnits: 27, drivers: 31, pay: 4.6, dispatch: 4.4, equipment: 4.7, homeTime: 4.1 }
];

export const scales = [
  { id: 'i80-eb-joliet', name: 'I-80 Eastbound Inspection Station', state: 'IL', highway: 'I-80 EB', mile: '127', status: 'open', confidence: 87, reports: 14, updated: '8 min ago' },
  { id: 'i55-nb-bolingbrook', name: 'I-55 Northbound Scale', state: 'IL', highway: 'I-55 NB', mile: '267', status: 'closed', confidence: 79, reports: 9, updated: '19 min ago' },
  { id: 'i94-wb-pleasant-prairie', name: 'I-94 Westbound Inspection Station', state: 'WI', highway: 'I-94 WB', mile: '347', status: 'unknown', confidence: 41, reports: 2, updated: '54 min ago' }
];

export const jobs = [
  { id: 1, title: 'Lead Pilot Car — Chicago to Indianapolis', role: 'Lead', origin: 'Joliet, IL', destination: 'Indianapolis, IN', rate: '$650 + hotel', date: 'Jul 22', requirements: ['IL/IN certified', 'CB radio'] },
  { id: 2, title: 'Height Pole — Milwaukee to Des Moines', role: 'Height pole', origin: 'Milwaukee, WI', destination: 'Des Moines, IA', rate: '$1.65/mi + deadhead', date: 'Jul 24', requirements: ['Height pole', 'IA certification'] },
  { id: 3, title: 'Chase Car — Gary to Columbus', role: 'Chase', origin: 'Gary, IN', destination: 'Columbus, OH', rate: '$575 flat', date: 'Jul 25', requirements: ['IN/OH certified', 'Insured'] }
];

export const petitions = [
  { slug: 'secure-american-eld-records', title: 'Secure American ELD Records', summary: 'Require tamper-evident records, U.S. accountability and complete edit histories.', signatures: 18420, target: 25000 },
  { slug: 'stop-driver-deposit-schemes', title: 'Stop Driver Deposit Schemes', summary: 'Ban mandatory company-driver deposits and payroll-funded escrow accounts.', signatures: 7814, target: 15000 },
  { slug: 'expand-truck-parking', title: 'Expand Truck Parking', summary: 'Fund safer truck parking and real-time availability on major freight corridors.', signatures: 32491, target: 50000 }
];
