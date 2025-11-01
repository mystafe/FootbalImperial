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
    // 2025-26 Süper Lig (18 takım)
    { name: "Galatasaray", city: "Istanbul", lon: 28.965, lat: 41.02, color: "#A90432", colors: ["#A90432", "#FDB912"], overall: 88, abbreviation: "GS", founded: 1905 },
    { name: "Fenerbahçe", city: "Istanbul", lon: 29.0634, lat: 41.0214, color: "#041E42", colors: ["#FEE715", "#041E42"], overall: 76, abbreviation: "FB", founded: 1907 },
    { name: "Beşiktaş", city: "Istanbul", lon: 29.01, lat: 41.039, color: "#000000", colors: ["#000000", "#FFFFFF"], overall: 78, abbreviation: "BJK", founded: 1903 },
    { name: "Trabzonspor", city: "Trabzon", lon: 39.7168, lat: 41.0031, color: "#7C162E", colors: ["#7C162E", "#64B5F6"], overall: 77, abbreviation: "TS", founded: 1967 },
    { name: "Samsunspor", city: "Samsun", lon: 36.33, lat: 41.2928, color: "#FF0000", colors: ["#FF0000", "#FFFFFF"], overall: 75, abbreviation: "SS", founded: 1965 },
    { name: "TÜMOSAN Konyaspor", city: "Konya", lon: 32.4846, lat: 37.8746, color: "#0B6E4F", colors: ["#0B6E4F", "#FFFFFF"], overall: 74, abbreviation: "KN", founded: 1922 },
    { name: "Kayserispor", city: "Kayseri", lon: 35.4853, lat: 38.7348, color: "#D32F2F", colors: ["#D32F2F", "#FBC02D"], overall: 71, abbreviation: "KY", founded: 1966 },
    { name: "Onvo Antalyaspor", city: "Antalya", lon: 30.7133, lat: 36.8969, color: "#D50000", colors: ["#D50000", "#FFFFFF"], overall: 71, abbreviation: "AT", founded: 1966 },
    { name: "RAMS Başakşehir", city: "Istanbul", lon: 28.8076, lat: 41.0931, color: "#1B3A68", colors: ["#1B3A68", "#FF6F00"], overall: 76, abbreviation: "BŞ", founded: 1990 },
    { name: "Kasımpaşa", city: "Istanbul", lon: 28.974, lat: 41.044, color: "#0046AD", colors: ["#0046AD", "#FFFFFF"], overall: 70, abbreviation: "KB", founded: 1921 },
    { name: "Solwie Energy Fatih Karagümrük", city: "Istanbul", lon: 28.955, lat: 41.022, color: "#000000", colors: ["#000000", "#FF0000"], overall: 69, abbreviation: "KG", founded: 1926 },
    { name: "Gaziantep FK", city: "Gaziantep", lon: 37.3792, lat: 37.0662, color: "#C62828", colors: ["#C62828", "#000000"], overall: 70, abbreviation: "GFK", founded: 1988 },
    { name: "Çaykur Rizespor", city: "Rize", lon: 40.5234, lat: 41.0201, color: "#007F5F", colors: ["#007F5F", "#FFFFFF"], overall: 69, abbreviation: "RZ", founded: 1953 },
    { name: "Gençlerbirliği", city: "Ankara", lon: 32.8597, lat: 39.9334, color: "#D50000", colors: ["#D50000", "#000000"], overall: 69, abbreviation: "GB", founded: 1923 },
    { name: "Eyüpspor", city: "Istanbul", lon: 28.94, lat: 41.06, color: "#5E3A8E", colors: ["#5E3A8E", "#F4C10F"], overall: 70, abbreviation: "EY", founded: 1919 },
    { name: "Göztepe", city: "Izmir", lon: 27.138, lat: 38.423, color: "#D90429", colors: ["#F7D417", "#D90429"], overall: 72, abbreviation: "GZ", founded: 1925 },
    { name: "Kocaelispor", city: "Kocaeli", lon: 29.919, lat: 40.765, color: "#006A4E", colors: ["#006A4E", "#000000"], overall: 70, abbreviation: "KO", founded: 1966 },
    { name: "Corendon Alanyaspor", city: "Antalya", lon: 31.995, lat: 36.543, color: "#F58220", colors: ["#F58220", "#16A34A"], overall: 70, abbreviation: "AL", founded: 1948 }
  ],
  "TFF 1.Lig": [
    // Example 2025 TFF 1.Lig teams (second-tier) - approximate locations
    { name: "Adanaspor", city: "Adana", lon: 35.3289, lat: 37.0000, colors: ["#FF6F00", "#FFFFFF"], abbreviation: "ADA", founded: 1954 },
    { name: "Bandırmaspor", city: "Bandırma", lon: 27.9769, lat: 40.3596, colors: ["#D50032", "#FFFFFF"], abbreviation: "BAN", founded: 1965 },
    { name: "Büyükşehir Belediye Erzurumspor", city: "Erzurum", lon: 41.2776, lat: 39.9208, colors: ["#0000FF", "#FFFFFF"], abbreviation: "BBE", founded: 2005 },
    { name: "Eyüpspor", city: "Istanbul", lon: 28.94, lat: 41.06, colors: ["#5E3A8E", "#F4C10F"], abbreviation: "EY", founded: 1919 },
    { name: "Gençlerbirliği", city: "Ankara", lon: 32.8597, lat: 39.9334, colors: ["#D50000", "#000000"], abbreviation: "GB", founded: 1923 },
    { name: "Menemenspor", city: "Izmir", lon: 27.1569, lat: 38.4961, colors: ["#00A8CC", "#FFFFFF"], abbreviation: "MEN", founded: 1969 },
    { name: "Samsunspor", city: "Samsun", lon: 36.33, lat: 41.2928, colors: ["#FF0000", "#FFFFFF"], abbreviation: "SS", founded: 1965 },
    { name: "Sakaryaspor", city: "Sakarya", lon: 30.4023, lat: 40.7768, colors: ["#006600", "#FFFFFF"], abbreviation: "SAK", founded: 1965 },
    { name: "Yeni Malatyaspor", city: "Malatya", lon: 38.3550, lat: 38.3556, colors: ["#FF8C00", "#000000"], abbreviation: "YMA", founded: 1986 }
  ],
  Italy: [
    // 2024-25 Serie A (20 teams)
    { name: "Juventus", city: "Turin", lon: 7.6869, lat: 45.0703, colors: ["#000000", "#FFFFFF"], overall: 85, abbreviation: "JUV", founded: 1897 },
    { name: "AC Milan", city: "Milan", lon: 9.19, lat: 45.4642, colors: ["#FB090B", "#000000"], overall: 84, abbreviation: "MIL", founded: 1899 },
    { name: "Inter", city: "Milan", lon: 9.19, lat: 45.4642, colors: ["#0068A8", "#000000"], overall: 86, abbreviation: "INT", founded: 1908 },
    { name: "Roma", city: "Rome", lon: 12.4964, lat: 41.9028, colors: ["#8B0000", "#FFD700"], overall: 82, abbreviation: "ROM", founded: 1927 },
    { name: "Lazio", city: "Rome", lon: 12.4964, lat: 41.9028, colors: ["#87CEEB", "#FFFFFF"], overall: 80, abbreviation: "LAZ", founded: 1900 },
    { name: "Napoli", city: "Naples", lon: 14.2681, lat: 40.8518, colors: ["#0066CC", "#FFFFFF"], overall: 83, abbreviation: "NAP", founded: 1926 },
    { name: "Fiorentina", city: "Florence", lon: 11.2558, lat: 43.7696, colors: ["#7B2CBF", "#FFFFFF"], overall: 78, abbreviation: "FIO", founded: 1926 },
    { name: "Atalanta", city: "Bergamo", lon: 9.6773, lat: 45.6983, colors: ["#0000FF", "#000000"], overall: 81, abbreviation: "ATA", founded: 1907 },
    { name: "Bologna", city: "Bologna", lon: 11.3426, lat: 44.4949, colors: ["#8B0000", "#0000FF"], overall: 76, abbreviation: "BOL", founded: 1909 },
    { name: "Torino", city: "Turin", lon: 7.6869, lat: 45.0703, colors: ["#8B0000", "#FFFFFF"], overall: 75, abbreviation: "TOR", founded: 1906 },
    { name: "Genoa", city: "Genoa", lon: 8.9463, lat: 44.4056, colors: ["#0000FF", "#FF0000"], overall: 74, abbreviation: "GEN", founded: 1893 },
    { name: "Monza", city: "Monza", lon: 9.2722, lat: 45.5845, colors: ["#FF0000", "#FFFFFF"], overall: 72, abbreviation: "MON", founded: 1912 },
    { name: "Lecce", city: "Lecce", lon: 18.1724, lat: 40.3573, colors: ["#FFD700", "#FF0000"], overall: 71, abbreviation: "LEC", founded: 1908 },
    { name: "Sassuolo", city: "Sassuolo", lon: 10.7844, lat: 44.5455, colors: ["#00FF00", "#000000"], overall: 73, abbreviation: "SAS", founded: 1920 },
    { name: "Udinese", city: "Udine", lon: 13.2420, lat: 46.0713, colors: ["#000000", "#FFFFFF"], overall: 75, abbreviation: "UDI", founded: 1896 },
    { name: "Verona", city: "Verona", lon: 10.9916, lat: 45.4384, colors: ["#FFD700", "#0000FF"], overall: 72, abbreviation: "VER", founded: 1903 },
    { name: "Cagliari", city: "Cagliari", lon: 9.1107, lat: 39.2238, colors: ["#0000FF", "#FF0000"], overall: 70, abbreviation: "CAG", founded: 1920 },
    { name: "Empoli", city: "Empoli", lon: 10.9516, lat: 43.7175, colors: ["#0000FF", "#FFFFFF"], overall: 69, abbreviation: "EMP", founded: 1920 },
    { name: "Frosinone", city: "Frosinone", lon: 13.3500, lat: 41.6400, colors: ["#FFD700", "#0000FF"], overall: 68, abbreviation: "FRO", founded: 1928 },
    { name: "Venezia", city: "Venice", lon: 12.3155, lat: 45.4408, colors: ["#0000FF", "#FFD700"], overall: 67, abbreviation: "VEN", founded: 1907 }
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
  Germany: [
    // 2024-25 Bundesliga (18 teams)
    { name: "Bayern Munich", city: "Munich", lon: 11.582, lat: 48.1351, colors: ["#DC052D", "#FFFFFF"], overall: 90, abbreviation: "FCB", founded: 1900 },
    { name: "Borussia Dortmund", city: "Dortmund", lon: 7.4653, lat: 51.5136, colors: ["#FDE100", "#000000"], overall: 85, abbreviation: "BVB", founded: 1909 },
    { name: "RB Leipzig", city: "Leipzig", lon: 12.3731, lat: 51.3397, colors: ["#FFFFFF", "#E41B17"], overall: 82, abbreviation: "RBL", founded: 2009 },
    { name: "Bayer Leverkusen", city: "Leverkusen", lon: 6.984, lat: 51.0303, colors: ["#E32219", "#000000"], overall: 81, abbreviation: "B04", founded: 1904 },
    { name: "Eintracht Frankfurt", city: "Frankfurt", lon: 8.6821, lat: 50.1109, colors: ["#E1000F", "#000000"], overall: 78, abbreviation: "SGE", founded: 1899 },
    { name: "VfB Stuttgart", city: "Stuttgart", lon: 9.1815, lat: 48.7758, colors: ["#FFFFFF", "#000000"], overall: 77, abbreviation: "VFB", founded: 1893 },
    { name: "Borussia Mönchengladbach", city: "Mönchengladbach", lon: 6.4428, lat: 51.1805, colors: ["#000000", "#FFFFFF"], overall: 76, abbreviation: "BMG", founded: 1900 },
    { name: "VfL Wolfsburg", city: "Wolfsburg", lon: 10.7871, lat: 52.4227, colors: ["#0066CC", "#FFFFFF"], overall: 75, abbreviation: "WOB", founded: 1945 },
    { name: "1. FC Union Berlin", city: "Berlin", lon: 13.405, lat: 52.52, colors: ["#FF0000", "#FFFFFF"], overall: 74, abbreviation: "UNI", founded: 1966 },
    { name: "SC Freiburg", city: "Freiburg", lon: 7.8423, lat: 47.9990, colors: ["#000000", "#FFFFFF"], overall: 73, abbreviation: "SCF", founded: 1904 },
    { name: "1. FC Köln", city: "Cologne", lon: 6.9603, lat: 50.9375, colors: ["#FFFFFF", "#FF0000"], overall: 72, abbreviation: "KOE", founded: 1948 },
    { name: "Werder Bremen", city: "Bremen", lon: 8.8017, lat: 53.0793, colors: ["#00FF00", "#FFFFFF"], overall: 71, abbreviation: "SVW", founded: 1899 },
    { name: "1. FSV Mainz 05", city: "Mainz", lon: 8.2473, lat: 49.9929, colors: ["#FF0000", "#FFFFFF"], overall: 70, abbreviation: "M05", founded: 1905 },
    { name: "FC Augsburg", city: "Augsburg", lon: 10.8978, lat: 48.3705, colors: ["#FF0000", "#FFFFFF"], overall: 69, abbreviation: "FCA", founded: 1907 },
    { name: "VfL Bochum", city: "Bochum", lon: 7.2162, lat: 51.4818, colors: ["#0000FF", "#FFFFFF"], overall: 68, abbreviation: "BOC", founded: 1848 },
    { name: "1. FC Heidenheim", city: "Heidenheim", lon: 10.1519, lat: 48.6785, colors: ["#0000FF", "#FF0000"], overall: 67, abbreviation: "FCH", founded: 1846 },
    { name: "SV Darmstadt 98", city: "Darmstadt", lon: 8.6512, lat: 49.8728, colors: ["#0000FF", "#FFFFFF"], overall: 66, abbreviation: "SVD", founded: 1898 },
    { name: "TSG Hoffenheim", city: "Sinsheim", lon: 8.8819, lat: 49.2524, colors: ["#0000FF", "#FFFFFF"], overall: 75, abbreviation: "TSG", founded: 1899 }
  ],
  Portugal: [
    { name: "Benfica", city: "Lisbon", lon: -9.1427, lat: 38.7369, colors: ["#E32636", "#FFFFFF"], abbreviation: "SLB" },
    { name: "Sporting", city: "Lisbon", lon: -9.1427, lat: 38.7369, colors: ["#00A650", "#FFFFFF"], abbreviation: "SCP" },
    { name: "Porto", city: "Porto", lon: -8.6291, lat: 41.1579, colors: ["#0033A0", "#FFFFFF"], abbreviation: "FCP" },
    { name: "Braga", city: "Braga", lon: -8.4292, lat: 41.5454, colors: ["#D00023", "#FFFFFF"], abbreviation: "SCB" },
    { name: "Guimarães", city: "Guimarães", lon: -8.29, lat: 41.4442, colors: ["#FFFFFF", "#000000"], abbreviation: "VSC" },
    { name: "Boavista", city: "Porto", lon: -8.6291, lat: 41.1579, colors: ["#000000", "#FFFFFF"], abbreviation: "BFC" }
  ],
  Netherlands: [
    { name: "Ajax", city: "Amsterdam", lon: 4.9041, lat: 52.3676, colors: ["#DA291C", "#FFFFFF"], abbreviation: "AJA" },
    { name: "PSV", city: "Eindhoven", lon: 5.4697, lat: 51.4416, colors: ["#D71920", "#FFFFFF"], abbreviation: "PSV" },
    { name: "Feyenoord", city: "Rotterdam", lon: 4.4777, lat: 51.9244, colors: ["#E0001F", "#FFFFFF"], abbreviation: "FEY" },
    { name: "AZ Alkmaar", city: "Alkmaar", lon: 4.7485, lat: 52.6319, colors: ["#E40E2D", "#000000"], abbreviation: "AZ" },
    { name: "Utrecht", city: "Utrecht", lon: 5.1214, lat: 52.0907, colors: ["#D81921", "#1F6FB2"], abbreviation: "UTR" },
    { name: "Heerenveen", city: "Heerenveen", lon: 5.9185, lat: 52.959, colors: ["#1F6FB2", "#FFFFFF"], abbreviation: "HEE" },
    { name: "Groningen", city: "Groningen", lon: 6.5665, lat: 53.2194, colors: ["#009A49", "#FFFFFF"], abbreviation: "GRO" },
    { name: "Twente", city: "Enschede", lon: 6.8958, lat: 52.2215, colors: ["#D71920", "#FFFFFF"], abbreviation: "TWE" }
  ],
  England: [
    // 2024-25 Premier League (20 teams)
    { name: "Manchester City", city: "Manchester", lon: -2.2426, lat: 53.4808, colors: ["#6CABDD", "#1C2C5B"], overall: 88, abbreviation: "MCI", founded: 1880 },
    { name: "Arsenal", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#EF0107", "#FFFFFF"], overall: 87, abbreviation: "ARS", founded: 1886 },
    { name: "Liverpool", city: "Liverpool", lon: -2.9779, lat: 53.4084, colors: ["#C8102E", "#00B2A9"], overall: 86, abbreviation: "LIV", founded: 1892 },
    { name: "Manchester United", city: "Manchester", lon: -2.2426, lat: 53.4808, colors: ["#DA291C", "#FFE500"], overall: 84, abbreviation: "MUN", founded: 1878 },
    { name: "Chelsea", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#034694", "#FFFFFF"], overall: 83, abbreviation: "CHE", founded: 1905 },
    { name: "Tottenham", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#001C58", "#FFFFFF"], overall: 82, abbreviation: "TOT", founded: 1882 },
    { name: "Newcastle United", city: "Newcastle", lon: -1.6178, lat: 54.9783, colors: ["#241F20", "#FFFFFF"], overall: 81, abbreviation: "NEW", founded: 1892 },
    { name: "Aston Villa", city: "Birmingham", lon: -1.8904, lat: 52.4862, colors: ["#95BFE5", "#670E36"], overall: 80, abbreviation: "AVL", founded: 1874 },
    { name: "Brighton & Hove Albion", city: "Brighton", lon: -0.1364, lat: 50.8225, colors: ["#0057B8", "#FFFFFF"], overall: 79, abbreviation: "BHA", founded: 1901 },
    { name: "West Ham United", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#7A263A", "#1BB1E7"], overall: 78, abbreviation: "WHU", founded: 1895 },
    { name: "Wolverhampton Wanderers", city: "Wolverhampton", lon: -2.1284, lat: 52.5869, colors: ["#FDB913", "#231F20"], overall: 77, abbreviation: "WOL", founded: 1877 },
    { name: "Crystal Palace", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#1B458F", "#C4122E"], overall: 76, abbreviation: "CRY", founded: 1905 },
    { name: "Fulham", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#FFFFFF", "#000000"], overall: 75, abbreviation: "FUL", founded: 1879 },
    { name: "Everton", city: "Liverpool", lon: -2.9916, lat: 53.4388, colors: ["#003399", "#FFFFFF"], overall: 74, abbreviation: "EVE", founded: 1878 },
    { name: "Brentford", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#D2001F", "#FFFFFF"], overall: 73, abbreviation: "BRE", founded: 1889 },
    { name: "Nottingham Forest", city: "Nottingham", lon: -1.1549, lat: 52.9548, colors: ["#FF0000", "#FFFFFF"], overall: 72, abbreviation: "NFO", founded: 1865 },
    { name: "Luton Town", city: "Luton", lon: -0.4175, lat: 51.8787, colors: ["#FF8C00", "#FFFFFF"], overall: 71, abbreviation: "LUT", founded: 1885 },
    { name: "Burnley", city: "Burnley", lon: -2.2430, lat: 53.7893, colors: ["#6C1D45", "#99D6EA"], overall: 70, abbreviation: "BUR", founded: 1882 },
    { name: "Sheffield United", city: "Sheffield", lon: -1.4701, lat: 53.3811, colors: ["#EE2737", "#FFFFFF"], overall: 69, abbreviation: "SHU", founded: 1889 },
    { name: "Bournemouth", city: "Bournemouth", lon: -1.8808, lat: 50.7192, colors: ["#DA020E", "#000000"], overall: 68, abbreviation: "BOU", founded: 1899 }
  ],
  "Champions League": [
    // Major European teams for Champions League (32 teams)
    { name: "Galatasaray", city: "Istanbul", lon: 28.965, lat: 41.02, color: "#A90432", colors: ["#A90432", "#FDB912"], overall: 88, abbreviation: "GS", founded: 1905 },
    { name: "Real Madrid", city: "Madrid", lon: -3.7038, lat: 40.4168, colors: ["#FFFFFF", "#FFD700"], overall: 92, abbreviation: "RMA", founded: 1902 },
    { name: "Barcelona", city: "Barcelona", lon: 2.1734, lat: 41.3851, colors: ["#A50044", "#004D98"], overall: 90, abbreviation: "BAR", founded: 1899 },
    { name: "Bayern Munich", city: "Munich", lon: 11.582, lat: 48.1351, colors: ["#DC052D", "#FFFFFF"], overall: 90, abbreviation: "FCB", founded: 1900 },
    { name: "Manchester City", city: "Manchester", lon: -2.2426, lat: 53.4808, colors: ["#6CABDD", "#1C2C5B"], overall: 88, abbreviation: "MCI", founded: 1880 },
    { name: "Arsenal", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#EF0107", "#FFFFFF"], overall: 87, abbreviation: "ARS", founded: 1886 },
    { name: "Liverpool", city: "Liverpool", lon: -2.9779, lat: 53.4084, colors: ["#C8102E", "#00B2A9"], overall: 86, abbreviation: "LIV", founded: 1892 },
    { name: "Inter", city: "Milan", lon: 9.19, lat: 45.4642, colors: ["#0068A8", "#000000"], overall: 86, abbreviation: "INT", founded: 1908 },
    { name: "AC Milan", city: "Milan", lon: 9.19, lat: 45.4642, colors: ["#FB090B", "#000000"], overall: 84, abbreviation: "MIL", founded: 1899 },
    { name: "Manchester United", city: "Manchester", lon: -2.2426, lat: 53.4808, colors: ["#DA291C", "#FFE500"], overall: 84, abbreviation: "MUN", founded: 1878 },
    { name: "Juventus", city: "Turin", lon: 7.6869, lat: 45.0703, colors: ["#000000", "#FFFFFF"], overall: 85, abbreviation: "JUV", founded: 1897 },
    { name: "Chelsea", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#034694", "#FFFFFF"], overall: 83, abbreviation: "CHE", founded: 1905 },
    { name: "Atlético Madrid", city: "Madrid", lon: -3.7038, lat: 40.4168, colors: ["#CE1126", "#FFFFFF"], overall: 85, abbreviation: "ATM", founded: 1903 },
    { name: "Napoli", city: "Naples", lon: 14.2681, lat: 40.8518, colors: ["#0066CC", "#FFFFFF"], overall: 83, abbreviation: "NAP", founded: 1926 },
    { name: "Tottenham", city: "London", lon: -0.1276, lat: 51.5074, colors: ["#001C58", "#FFFFFF"], overall: 82, abbreviation: "TOT", founded: 1882 },
    { name: "Roma", city: "Rome", lon: 12.4964, lat: 41.9028, colors: ["#8B0000", "#FFD700"], overall: 82, abbreviation: "ROM", founded: 1927 },
    { name: "PSG", city: "Paris", lon: 2.3522, lat: 48.8566, colors: ["#004170", "#ED1C24"], overall: 89, abbreviation: "PSG", founded: 1970 },
    { name: "Borussia Dortmund", city: "Dortmund", lon: 7.4653, lat: 51.5136, colors: ["#FDE100", "#000000"], overall: 85, abbreviation: "BVB", founded: 1909 },
    { name: "RB Leipzig", city: "Leipzig", lon: 12.3731, lat: 51.3397, colors: ["#FFFFFF", "#E41B17"], overall: 82, abbreviation: "RBL", founded: 2009 },
    { name: "Bayer Leverkusen", city: "Leverkusen", lon: 6.984, lat: 51.0303, colors: ["#E32219", "#000000"], overall: 81, abbreviation: "B04", founded: 1904 },
    { name: "Atalanta", city: "Bergamo", lon: 9.6773, lat: 45.6983, colors: ["#0000FF", "#000000"], overall: 81, abbreviation: "ATA", founded: 1907 },
    { name: "Newcastle United", city: "Newcastle", lon: -1.6178, lat: 54.9783, colors: ["#241F20", "#FFFFFF"], overall: 81, abbreviation: "NEW", founded: 1892 },
    { name: "Lazio", city: "Rome", lon: 12.4964, lat: 41.9028, colors: ["#87CEEB", "#FFFFFF"], overall: 80, abbreviation: "LAZ", founded: 1900 },
    { name: "Aston Villa", city: "Birmingham", lon: -1.8904, lat: 52.4862, colors: ["#95BFE5", "#670E36"], overall: 80, abbreviation: "AVL", founded: 1874 },
    { name: "Sevilla", city: "Seville", lon: -5.9845, lat: 37.3891, colors: ["#FFFFFF", "#FF0000"], overall: 82, abbreviation: "SEV", founded: 1890 },
    { name: "Valencia", city: "Valencia", lon: -0.3763, lat: 39.4699, colors: ["#FF6600", "#000000"], overall: 80, abbreviation: "VAL", founded: 1919 },
    { name: "Villarreal", city: "Villarreal", lon: -0.1014, lat: 39.937, colors: ["#FFD700", "#000000"], overall: 79, abbreviation: "VIL", founded: 1923 },
    { name: "Real Sociedad", city: "San Sebastián", lon: -1.9812, lat: 43.3183, colors: ["#0033A0", "#FFFFFF"], overall: 78, abbreviation: "RSO", founded: 1909 },
    { name: "Athletic Bilbao", city: "Bilbao", lon: -2.935, lat: 43.263, colors: ["#FF0000", "#FFFFFF"], overall: 77, abbreviation: "ATH", founded: 1898 },
    { name: "Benfica", city: "Lisbon", lon: -9.1427, lat: 38.7369, colors: ["#E32636", "#FFFFFF"], overall: 82, abbreviation: "SLB", founded: 1904 },
    { name: "Porto", city: "Porto", lon: -8.6291, lat: 41.1579, colors: ["#0033A0", "#FFFFFF"], overall: 81, abbreviation: "FCP", founded: 1893 },
    { name: "Sporting", city: "Lisbon", lon: -9.1427, lat: 38.7369, colors: ["#00A650", "#FFFFFF"], overall: 80, abbreviation: "SCP", founded: 1906 }
  ]
}
