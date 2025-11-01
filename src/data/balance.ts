export const BALANCE = {
  k: 14,
  attackerAdvantageX: 0.2,
  neighborSupportWeight: 0.5,
  form: {
    win: 0.02,
    loss: -0.02,
    min: 0.9,
    max: 1.1
  },
  neutrals: {
    share: 0.2,
    captureProbability: 0.75,
    color: "#475569"
  },
  capital: {
    penaltyTurns: 3,
    penaltyPower: 2
  }
  ,armies: {
    armyPower: 0.5 // contribution of each army to battle power
  }
}
