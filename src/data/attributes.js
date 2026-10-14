// Approximate attributes per barrio, ordered by the official barrio code (1–73).
// POP: residents in thousands (rounded). LEI: leisure / night-life pull (0–1).
// WRK: daytime work + study pull (0–1). These drive the simulated dataset only;
// a real flows CSV (and optional attributes CSV) can replace them from the Datos panel.

export const POP = [48,23,14,22,33,52,44,42,58,38,40,1.5,31,10,16,19,24,42,47,24,12,5,25,16,26,47,31,16,7,13,51,35,26,9,36,10,32,12,7,5,6,0.6,27,26,24,16,2,15,7,16,12,27,8,3,11,1.5,10,2.5,13,58,30,14,22,39,28,16,10,34,14,25,21,26,29]
export const LEI = [.9,1,.75,.9,.3,.35,.7,.8,.4,.75,.7,.05,.15,.2,.3,.15,.15,.45,.4,.2,.15,.05,.4,.3,.35,.55,.25,.2,.1,.15,.95,.45,.3,.1,.2,.1,.15,.1,.05,.05,.1,.05,.25,.15,.15,.1,.02,.1,.05,.08,.1,.15,.05,.02,.05,.02,.05,.03,.08,.35,.2,.15,.15,.3,.3,.45,.7,.65,.4,.1,.15,.15,.15]
export const WRK = [.4,.7,.4,.6,.5,.45,1,.7,.55,.4,.3,.8,.35,.3,.3,.2,.2,.5,.75,.8,.6,.1,.4,.4,.55,.75,.3,.2,.1,.2,.5,.35,.3,.1,.25,.1,.15,.15,.2,.25,.7,.1,.3,.2,.2,.15,.05,.15,.1,.1,.15,.2,.1,.05,.1,.1,.15,.2,.35,.4,.35,.2,.25,.3,.35,.95,.45,.55,.7,.3,.4,.25,.25]

export const DISTRICTS = ['', 'Ciutat Vella', 'Eixample', 'Sants-Montjuïc', 'Les Corts', 'Sarrià-Sant Gervasi', 'Gràcia', 'Horta-Guinardó', 'Nou Barris', 'Sant Andreu', 'Sant Martí']
export const DISTRICT_SHORT = ['', 'Ciutat Vella', 'Eixample', 'Sants-Mont.', 'Les Corts', 'Sarrià-SG', 'Gràcia', 'Horta-Guin.', 'Nou Barris', 'Sant Andreu', 'Sant Martí']

// Short names used on the map and in compact lists.
export const SHORT = {
  0: 'Raval', 1: 'Gòtic', 2: 'Barceloneta', 3: 'El Born', 4: 'Fort Pienc', 5: 'Sagrada Família',
  6: 'Dreta Eixample', 7: 'Antiga Esquerra', 8: 'Nova Esquerra', 9: 'Sant Antoni', 10: 'Poble-sec',
  11: 'Marina Prat Vermell', 12: 'Marina de Port', 13: 'Font de la Guatlla', 16: 'Sants-Badal',
  17: 'Sants', 18: 'Les Corts', 19: 'Maternitat', 20: 'Pedralbes', 21: 'Vallvidrera', 22: 'Sarrià',
  23: 'Tres Torres', 24: 'Bonanova', 25: 'Galvany', 26: 'Putxet', 27: 'Vallcarca', 30: 'Gràcia',
  31: "Camp d'en Grassot", 32: 'Baix Guinardó', 35: "Font d'en Fargues", 36: 'El Carmel',
  38: 'Sant Genís', 40: "Vall d'Hebron", 42: 'Horta', 43: 'Vilapicina', 50: 'Verdun', 51: 'Prosperitat',
  52: 'Trinitat Nova', 54: 'Ciutat Meridiana', 56: 'Trinitat Vella', 57: 'Baró de Viver', 58: 'Bon Pastor',
  59: 'Sant Andreu', 60: 'La Sagrera', 61: 'Congrés', 63: "Camp de l'Arpa", 64: 'El Clot', 65: '22@',
  66: 'Vila Olímpica', 67: 'Poblenou', 68: 'Diagonal Mar', 69: 'Besòs', 70: 'Provençals',
  71: 'Sant Martí', 72: 'La Verneda',
}

// Event barrio for the simulated Wednesday match (Camp Nou sits in la Maternitat i Sant Ramon).
export const MATCH_BARRIO = 19
export const OFFICE_22 = 65
