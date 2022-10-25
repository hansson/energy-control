import express, { Application, Request, Response } from "express";
import { ControlInfo, DaikinAC } from "daikin-controller";
import { PriceManager } from "./price-manager";
import CronJob from "node-cron";
import fs from "fs";
import {
  DaikinConfig,
  FanRequest,
  ModeRequest,
  OverrideRequest,
  PriceRequest,
  TemperatureRequest,
} from "./interfaces";

const port = Number(3000);
const app: Application = express();
app.use(express.json());
app.use(express.static("static"));
let priceManager = new PriceManager();
const ac = new DaikinAC(
  "192.168.50.120",
  { useGetToPost: true },
  (err, info) => {}
);

const sendStatusResponse = (
  config: DaikinConfig,
  info: ControlInfo | null,
  res: Response
) => {
  const response = {
    price: config.price,
    override: config.override,
    overrideUntil: config.overrideUntil,
    temp: info?.targetTemperature,
    power: info?.power,
    mode: info?.mode == 3 ? "COLD" : info?.mode == 4 ? "HEAT" : info?.mode,
    fan:
      info?.fanRate == "A"
        ? "AUTO"
        : info?.fanRate == "B"
        ? "SILENT"
        : info?.fanRate, //A=Auto, B=Indoor Quiet
  };
  res.set("Content-Type", "application/json");
  res.send(JSON.stringify(response));
};

app.get("/daikin", (req: Request, res: Response) => {
  const file = fs.readFileSync("config");
  const config = JSON.parse(file.toString()) as DaikinConfig;

  ac.getACControlInfo((err, info) => {
    sendStatusResponse(config, info, res);
  });
});

app.post("/daikin/mode", (req: Request, res: Response) => {
  const file = fs.readFileSync("config");
  const config = JSON.parse(file.toString()) as DaikinConfig;

  const request: ModeRequest = req.body;
  let mode = 4; //HEAT
  if (request.mode == "COLD") {
    mode = 3;
  }
  ac.setACControlInfo({ mode: mode }, (err, info) => {
    sendStatusResponse(config, info, res);
  });
});

app.post("/daikin/temp", (req: Request<TemperatureRequest>, res: Response) => {
  const file = fs.readFileSync("config");
  const config = JSON.parse(file.toString()) as DaikinConfig;

  const request: TemperatureRequest = req.body;
  ac.setACControlInfo({ targetTemperature: request.temp }, (err, info) => {
    sendStatusResponse(config, info, res);
  });
});

app.post("/daikin/fan", (req: Request<FanRequest>, res: Response) => {
  const file = fs.readFileSync("config");
  const config = JSON.parse(file.toString()) as DaikinConfig;

  const request: FanRequest = req.body;
  let mode: "A" | "B" = "A";
  if (request.fan == "SILENT") {
    mode = "B";
  }
  ac.setACControlInfo({ fanRate: mode }, (err, info) => {
    sendStatusResponse(config, info, res);
  });
});

app.post("/daikin/price", (req: Request<PriceRequest>, res: Response) => {
  const file = fs.readFileSync("config");
  const config = JSON.parse(file.toString()) as DaikinConfig;
  config.price = req.body.price;
  fs.writeFileSync("config", JSON.stringify(config));

  ac.getACControlInfo((err, info) => {
    sendStatusResponse(config, info, res);
  });
});

app.post("/daikin/override", (req: Request<OverrideRequest>, res: Response) => {
  const file = fs.readFileSync("config");
  const config = JSON.parse(file.toString()) as DaikinConfig;
  const request: OverrideRequest = req.body;
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + request.hours);
  config.overrideUntil = now;
  config.override = true;

  fs.writeFileSync("config", JSON.stringify(config));
  ac.setACControlInfo({ power: request.power }, (err, info) => {
    sendStatusResponse(config, info, res);
  });
});

app.get("/prices", (req: Request, res: Response) => {
  const pricesToday = priceManager.getPricesForDate(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pricesTomorrow = priceManager.getPricesForDate(tomorrow);
  Promise.all([pricesToday, pricesTomorrow]).then((values) => res.send(values));
});

app.listen(port, () => {
  console.log(`server started on port ${port}`);
});

CronJob.schedule("* * * * *", () => {
  if (
    (new Date().getUTCHours() == 13 && new Date().getUTCMinutes() == 5) ||
    (new Date().getUTCHours() == 17 && new Date().getUTCMinutes() == 5)
  ) {
    priceManager = new PriceManager();
  }

  priceManager.getCurrentPrice().then((price) => {
    if (!price) {
      //If we for some reason have not loaded the prices then dont change stuff
      return;
    }
    const file = fs.readFileSync("config");
    const config = JSON.parse(file.toString()) as DaikinConfig;

    if (
      config.overrideUntil &&
      new Date(config.overrideUntil).getTime() < new Date().getTime()
    ) {
      config.overrideUntil = undefined;
      config.override = false;
      fs.writeFileSync("config", JSON.stringify(config));
    }

    if (config.override == true) {
      return;
    }

    ac.setACControlInfo({ power: config.price > price }, (err, info) => {});
  });
});
