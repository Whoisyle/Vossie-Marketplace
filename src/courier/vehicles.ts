import type { Vehicle } from "./types";

/** Cars sold in South Africa, by make, with the models couriers drive. */
export const CAR_MAKES: Record<string, string[]> = {
  Chery: ["Tiggo 4 Pro", "Tiggo 7 Pro", "QQ"],
  Datsun: ["Go", "Go+"],
  Ford: ["Figo", "Fiesta", "EcoSport", "Ranger"],
  Haval: ["Jolion", "H6"],
  Honda: ["Fit", "Ballade", "BR-V", "HR-V"],
  Hyundai: ["i10", "Grand i10", "i20", "Venue", "Creta"],
  Kia: ["Picanto", "Rio", "Sonet", "Seltos"],
  Mazda: ["Mazda2", "Mazda3", "CX-3", "CX-5"],
  Nissan: ["Micra", "Almera", "Magnite", "NP200", "Qashqai"],
  Renault: ["Kwid", "Sandero", "Kiger", "Clio"],
  Suzuki: ["Swift", "Celerio", "S-Presso", "Dzire", "Vitara", "Jimny", "Ertiga"],
  Toyota: ["Corolla", "Corolla Cross", "Yaris", "Starlet", "Etios", "Fortuner", "Hilux", "Rumion"],
  Volkswagen: ["Polo", "Polo Vivo", "Golf", "T-Cross", "Tiguan"],
};

/** Scooters and small motorbikes. */
export const SCOOTER_MAKES: Record<string, string[]> = {
  Honda: ["PCX", "Dio", "Forza", "CB125F"],
  Kymco: ["Agility", "Like", "Super 8"],
  Mahindra: ["Gusto", "Rodeo"],
  Piaggio: ["Liberty", "Medley"],
  Suzuki: ["Burgman", "Address", "GN125"],
  SYM: ["Symphony", "Jet 14", "Fiddle"],
  TVS: ["Jupiter", "Ntorq", "Apache"],
  Vespa: ["Primavera", "Sprint", "GTS"],
  Yamaha: ["NMAX", "Aerox", "Zuma", "Crux"],
};

export const COLOURS = ["White", "Silver", "Grey", "Black", "Blue", "Red", "Green", "Yellow", "Orange", "Brown", "Gold", "Beige"] as const;

/** The makes a courier can choose for their vehicle. */
export function makesFor(vehicle: Vehicle): string[] {
  return Object.keys(vehicle === "scooter" ? SCOOTER_MAKES : CAR_MAKES).sort();
}

/** The models of a make for a vehicle. */
export function modelsFor(vehicle: Vehicle, make: string): string[] {
  return (vehicle === "scooter" ? SCOOTER_MAKES : CAR_MAKES)[make] ?? [];
}
