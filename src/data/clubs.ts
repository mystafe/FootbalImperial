import type { CountryKey } from "../store/game"

export interface Club {
  name: string
  city: string
  lon: number
  lat: number
  color?: string
  colors?: string[]
  overall?: number
  abbreviation?: string
  founded?: number
}

export const COUNTRY_CLUBS: Record<CountryKey, Club[]> = {
  Turkey: [
    {
      name: "Galatasaray",
      city: "Istanbul",
      lon: 28.965,
      lat: 41.02,
      color: "#A3262A",
      colors: ["#F4C10F", "#A3262A"],
      overall: 85,
      abbreviation: "GS",
      founded: 1905
    },
    {
      name: "Fenerbahçe",
      city: "Istanbul",
      lon: 29.0634,
      lat: 41.0214,
      color: "#041E42",
      colors: ["#FEE715", "#041E42"],
      overall: 79,
      abbreviation: "FB",
      founded: 1907
    },
    {
      name: "Beşiktaş",
      city: "Istanbul",
      lon: 29.01,
      lat: 41.039,
      color: "#000000",
      colors: ["#000000", "#FFFFFF"],
      overall: 78,
      abbreviation: "BJK",
      founded: 1903
    },
    {
      name: "Trabzonspor",
      city: "Trabzon",
      lon: 39.7168,
      lat: 41.0031,
      color: "#7C162E",
      colors: ["#7C162E", "#64B5F6"],
      overall: 77,
      abbreviation: "TS",
      founded: 1967
    },
    {
      name: "Samsunspor",
      city: "Samsun",
      lon: 36.3300,
      lat: 41.2928,
      color: "#FF0000",
      colors: ["#FF0000", "#FFFFFF"],
      overall: 75,
      abbreviation: "SS",
      founded: 1965
    },
    {
      name: "Konyaspor",
      city: "Konya",
      lon: 32.4846,
      lat: 37.8746,
      color: "#0B6E4F",
      colors: ["#0B6E4F", "#FFFFFF"],
      overall: 74,
      abbreviation: "KN",
      founded: 1922
    },
    {
      name: "Kayserispor",
      city: "Kayseri",
      lon: 35.4853,
      lat: 38.7348,
      color: "#D32F2F",
      colors: ["#D32F2F", "#FBC02D"],
      overall: 71,
      abbreviation: "KY",
      founded: 1966
    },
    {
      name: "Antalyaspor",
      city: "Antalya",
      lon: 30.7133,
      lat: 36.8969,
      color: "#D50000",
      colors: ["#D50000", "#FFFFFF"],
      overall: 71,
      abbreviation: "AT",
      founded: 1966
    },
    {
      name: "Başakşehir",
      city: "Istanbul",
      lon: 28.8076,
      lat: 41.0931,
      color: "#1B3A68",
      colors: ["#1B3A68", "#FF6F00"],
      overall: 76,
      abbreviation: "BŞ",
      founded: 1990
    },
    {
      name: "Kasımpaşa",
      city: "Istanbul",
      lon: 28.974,
      lat: 41.044,
      color: "#0046AD",
      colors: ["#0046AD", "#FFFFFF"],
      overall: 70,
      abbreviation: "KB",
      founded: 1921
    },
    {
      name: "İstanbulspor",
      city: "Istanbul",
      lon: 28.866,
      lat: 41.06,
      color: "#000000",
      colors: ["#000000", "#FFD200"],
      overall: 68,
      abbreviation: "İS",
      founded: 1926
    },
    {
      name: "Karagümrük",
      city: "Istanbul",
      lon: 28.955,
      lat: 41.022,
      color: "#000000",
      colors: ["#000000", "#FF0000"],
      overall: 69,
      abbreviation: "KG",
      founded: 1926
    },
    {
      name: "Gaziantep FK",
      city: "Gaziantep",
      lon: 37.3792,
      lat: 37.0662,
      color: "#C62828",
      colors: ["#C62828", "#000000"],
      overall: 70,
      abbreviation: "GFK",
      founded: 1988
    },
    {
      name: "Rizespor",
      city: "Rize",
      lon: 40.5234,
      lat: 41.0201,
      color: "#007F5F",
      colors: ["#007F5F", "#FFFFFF"],
      overall: 69,
      abbreviation: "RZ",
      founded: 1953
    },
    {
      name: "MKE Ankaragücü",
      city: "Ankara",
      lon: 32.8597,
      lat: 39.9334,
      color: "#0D47A1",
      colors: ["#0D47A1", "#FFD600"],
      overall: 71,
      abbreviation: "AG",
      founded: 1910
    },
    {
      name: "Gençlerbirliği",
      city: "Ankara",
      lon: 32.8597,
      lat: 39.9334,
      color: "#D50000",
      colors: ["#D50000", "#000000"],
      overall: 69,
      abbreviation: "GB",
      founded: 1923
    },
    {
      name: "Adana Demirspor",
      city: "Adana",
      lon: 35.3213,
      lat: 37.0007,
      color: "#0E4C92",
      colors: ["#0E4C92", "#87CEEB"],
      overall: 75,
      abbreviation: "AD",
      founded: 1940
    },
    {
      name: "Bursaspor",
      city: "Bursa",
      lon: 29.061,
      lat: 40.195,
      color: "#008D4F",
      colors: ["#008D4F", "#FFFFFF"],
      overall: 72,
      abbreviation: "BS",
      founded: 1963
    },
    {
      name: "Sivasspor",
      city: "Sivas",
      lon: 37.016,
      lat: 39.7477,
      color: "#E51C23",
      colors: ["#E51C23", "#FFFFFF"],
      overall: 70,
      abbreviation: "SV",
      founded: 1967
    }
  ],
  Italy: [
    {
      name: "Juventus",
      city: "Turin",
      lon: 7.6869,
      lat: 45.0703,
      colors: ["#000000", "#FFFFFF"],
      abbreviation: "JUV",
      founded: 1897
    },
    {
      name: "AC Milan",
      city: "Milan",
      lon: 9.19,
      lat: 45.4642,
      colors: ["#FB090B", "#000000"],
      abbreviation: "MIL",
      founded: 1899
    },
    {
      name: "Inter",
      city: "Milan",
      lon: 9.19,
      lat: 45.4642,
      colors: ["#0068A8", "#000000"],
      abbreviation: "INT",
      founded: 1908
    },
    {
      name: "Roma",
      city: "Rome",
      lon: 12.4964,
      lat: 41.9028,
      colors: ["#8B0000", "#FFD700"],
      abbreviation: "ROM",
      founded: 1927
    },
    {
      name: "Lazio",
      city: "Rome",
      lon: 12.4964,
      lat: 41.9028,
      colors: ["#87CEEB", "#FFFFFF"],
      abbreviation: "LAZ",
      founded: 1900
    },
    {
      name: "Napoli",
      city: "Naples",
      lon: 14.2681,
      lat: 40.8518,
      colors: ["#0066CC", "#FFFFFF"],
      abbreviation: "NAP",
      founded: 1926
    },
    {
      name: "Fiorentina",
      city: "Florence",
      lon: 11.2558,
      lat: 43.7696,
      colors: ["#7B2CBF", "#FFFFFF"],
      abbreviation: "FIO",
      founded: 1926
    },
    {
      name: "Atalanta",
      city: "Bergamo",
      lon: 9.6773,
      lat: 45.6983,
      colors: ["#0000FF", "#000000"],
      abbreviation: "ATA",
      founded: 1907
    }
  ],
  Spain: [
    {
      name: "Real Madrid",
      city: "Madrid",
      lon: -3.7038,
      lat: 40.4168,
      colors: ["#FFFFFF", "#FFD700"],
      abbreviation: "RMA",
      founded: 1902
    },
    {
      name: "Barcelona",
      city: "Barcelona",
      lon: 2.1734,
      lat: 41.3851,
      colors: ["#A50044", "#004D98"],
      abbreviation: "BAR",
      founded: 1899
    },
    {
      name: "Atlético Madrid",
      city: "Madrid",
      lon: -3.7038,
      lat: 40.4168,
      colors: ["#CE1126", "#FFFFFF"],
      abbreviation: "ATM",
      founded: 1903
    },
    {
      name: "Sevilla",
      city: "Seville",
      lon: -5.9845,
      lat: 37.3891,
      colors: ["#FFFFFF", "#FF0000"],
      abbreviation: "SEV",
      founded: 1890
    },
    {
      name: "Valencia",
      city: "Valencia",
      lon: -0.3763,
      lat: 39.4699,
      colors: ["#FF6600", "#000000"],
      abbreviation: "VAL",
      founded: 1919
    },
    {
      name: "Villarreal",
      city: "Villarreal",
      lon: -0.1014,
      lat: 39.937,
      colors: ["#FFD700", "#000000"],
      abbreviation: "VIL",
      founded: 1923
    },
    {
      name: "Real Sociedad",
      city: "San Sebastián",
      lon: -1.9812,
      lat: 43.3183,
      colors: ["#0033A0", "#FFFFFF"],
      abbreviation: "RSO",
      founded: 1909
    },
    {
      name: "Athletic Bilbao",
      city: "Bilbao",
      lon: -2.935,
      lat: 43.263,
      colors: ["#FF0000", "#FFFFFF"],
      abbreviation: "ATH",
      founded: 1898
    }
  ],
  France: [
    {
      name: "PSG",
      city: "Paris",
      lon: 2.3522,
      lat: 48.8566,
      colors: ["#004170", "#ED1C24"],
      abbreviation: "PSG",
      founded: 1970
    },
    {
      name: "Marseille",
      city: "Marseille",
      lon: 5.3698,
      lat: 43.2965,
      colors: ["#00A8CC", "#FFFFFF"],
      abbreviation: "OM",
      founded: 1899
    },
    {
      name: "Lyon",
      city: "Lyon",
      lon: 4.8357,
      lat: 45.764,
      colors: ["#FFFFFF", "#0000FF"],
      abbreviation: "OL",
      founded: 1950
    },
    {
      name: "Monaco",
      city: "Monaco",
      lon: 7.4246,
      lat: 43.7384,
      colors: ["#FF0000", "#FFFFFF"],
      abbreviation: "ASM",
      founded: 1924
    },
    {
      name: "Lille",
      city: "Lille",
      lon: 3.0573,
      lat: 50.6292,
      colors: ["#FF0000", "#0000FF"],
      abbreviation: "LOSC",
      founded: 1944
    },
    {
      name: "Nice",
      city: "Nice",
      lon: 7.2619,
      lat: 43.7102,
      colors: ["#FF0000", "#000000"],
      abbreviation: "OGCN",
      founded: 1904
    },
    {
      name: "Saint-Étienne",
      city: "Saint-Étienne",
      lon: 4.3872,
      lat: 45.4397,
      colors: ["#00FF00", "#FFFFFF"],
      abbreviation: "ASSE",
      founded: 1919
    },
    {
      name: "Rennes",
      city: "Rennes",
      lon: -1.6778,
      lat: 48.1173,
      colors: ["#FF0000", "#000000"],
      abbreviation: "SRFC",
      founded: 1901
    }
  ],
  Germany: [
    { name: "Bayern", city: "Munich", lon: 11.582, lat: 48.1351 },
    { name: "Dortmund", city: "Dortmund", lon: 7.4653, lat: 51.5136 },
    { name: "Schalke", city: "Gelsenkirchen", lon: 7.081, lat: 51.5177 },
    { name: "RB Leipzig", city: "Leipzig", lon: 12.3731, lat: 51.3397 },
    { name: "Leverkusen", city: "Leverkusen", lon: 6.984, lat: 51.0303 },
    { name: "Frankfurt", city: "Frankfurt", lon: 8.6821, lat: 50.1109 },
    { name: "Hertha", city: "Berlin", lon: 13.405, lat: 52.52 },
    { name: "Hamburg", city: "Hamburg", lon: 9.9937, lat: 53.5511 }
  ],
  Portugal: [
    { name: "Benfica", city: "Lisbon", lon: -9.1427, lat: 38.7369 },
    { name: "Sporting", city: "Lisbon", lon: -9.1427, lat: 38.7369 },
    { name: "Porto", city: "Porto", lon: -8.6291, lat: 41.1579 },
    { name: "Braga", city: "Braga", lon: -8.4292, lat: 41.5454 },
    { name: "Guimarães", city: "Guimarães", lon: -8.29, lat: 41.4442 },
    { name: "Boavista", city: "Porto", lon: -8.6291, lat: 41.1579 }
  ],
  Netherlands: [
    { name: "Ajax", city: "Amsterdam", lon: 4.9041, lat: 52.3676 },
    { name: "PSV", city: "Eindhoven", lon: 5.4697, lat: 51.4416 },
    { name: "Feyenoord", city: "Rotterdam", lon: 4.4777, lat: 51.9244 },
    { name: "AZ Alkmaar", city: "Alkmaar", lon: 4.7485, lat: 52.6319 },
    { name: "Utrecht", city: "Utrecht", lon: 5.1214, lat: 52.0907 },
    { name: "Heerenveen", city: "Heerenveen", lon: 5.9185, lat: 52.959 },
    { name: "Groningen", city: "Groningen", lon: 6.5665, lat: 53.2194 },
    { name: "Twente", city: "Enschede", lon: 6.8958, lat: 52.2215 }
  ],
  England: [
    {
      name: "Manchester United",
      city: "Manchester",
      lon: -2.2426,
      lat: 53.4808
    },
    { name: "Manchester City", city: "Manchester", lon: -2.2426, lat: 53.4808 },
    { name: "Liverpool", city: "Liverpool", lon: -2.9779, lat: 53.4084 },
    { name: "Everton", city: "Liverpool", lon: -2.9916, lat: 53.4388 },
    { name: "Chelsea", city: "London", lon: -0.1276, lat: 51.5074 },
    { name: "Arsenal", city: "London", lon: -0.1276, lat: 51.5074 },
    { name: "Tottenham", city: "London", lon: -0.1276, lat: 51.5074 },
    { name: "Newcastle", city: "Newcastle", lon: -1.6178, lat: 54.9783 }
  ]
}
