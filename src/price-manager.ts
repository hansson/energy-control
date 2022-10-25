import { DailyPrices } from "./daily-prices";

export class PriceManager {
  priceHistory: DailyPrices[];

  constructor() {
    this.priceHistory = [];
  }

  getPricesForDate = (date: Date) => {
    const pricesForDate = this.priceHistory
      .filter((dailyPrices) => {
        return (
          date.getDate() == dailyPrices.date.getDate() &&
          date.getMonth() == dailyPrices.date.getMonth() &&
          date.getFullYear() == dailyPrices.date.getFullYear()
        );
      })
      .filter((dailyPrices) => dailyPrices.prices.length > 0);

    if (pricesForDate.length == 0) {
      const prices = new DailyPrices(date);
      return prices.initPrices().then(() => {
        this.priceHistory.push(prices);
        console.log(`Created ${prices.date}`);
        return prices;
      });
    }

    return Promise.resolve(pricesForDate[0]);
  };

  getCurrentPrice = () => {
    return this.getPricesForDate(new Date()).then((day) => {
      return day.prices.filter((entry) => {
        const hour = entry.hour;
        const currentHour =
          new Date().getUTCHours() > 9
            ? new Date().getUTCHours()
            : `0${new Date().getUTCHours()}`;
        return hour == currentHour + ":00";
      })[0]?.price;
    });
  };
}
