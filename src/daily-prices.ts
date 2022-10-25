import fetch, { Response } from "node-fetch";

export interface Price {
  hour: string;
  price: number;
}

interface RemotePrice {
  cat: string;
  val1: string;
}

export class DailyPrices {
  prices: Price[];
  date: Date;

  constructor(date: Date) {
    this.prices = [];
    this.date = date;
  }

  initPrices = () => {
    const day =
      this.date.getDate() >= 10
        ? this.date.getDate()
        : "0" + this.date.getDate();
    let month: String | number = this.date.getMonth() + 1;
    month = month >= 10 ? month : "0" + month;
    const formattedDate = day + "." + month + "." + this.date.getFullYear();

    return fetch(
      `https://m-transparency.entsoe.eu/transmission-domain/r2/dayAheadPrices/show?name=&defaultValue=false&viewType=GRAPH&areaType=BZN&atch=false&dateTime.dateTime=${formattedDate}%2000:00%7CCET%7CDAY&biddingZone.values=CTY%7C10YSE-1--------K\u0021BZN%7C10Y1001A1001A47J&resolution.values=PT60M&dateTime.timezone=UTC&dateTime.timezone_input=UTC&_=1665004311739`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Cookie:
            "org.springframework.mobile.device.site.CookieSitePreferenceRepository.SITE_PREFERENCE=MOBILE",
        },
      }
    ).then(this.resolvePrices);
  };

  resolvePrices = (data: Response) => {
    data.text().then((text) => {
      if (text.indexOf('{"data":"NO_DATA"}') == -1) {
        const start = text.indexOf("chartData") + 11;
        const end = text.indexOf("</script>") - 3;

        const remotePrices: RemotePrice[] = JSON.parse(
          text.substring(start, end)
        );

        this.prices = remotePrices.map((remotePrice) => {
          return {
            hour: remotePrice.cat,
            price:
              Math.round((Number.parseFloat(remotePrice.val1) / 0.7384) * 10) /
              10,
          } as Price;
        });
      }
    });
  };
}
