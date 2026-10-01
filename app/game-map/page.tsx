// app/game-map/page.tsx -- заглушка игровой карты A1 («скоро»).
//
// Александр, 02.10.2026: игровая карта компаний и людей в духе карты из
// Ведьмака (Украина, здания по числу сотрудников, коты-путники). Пока
// карта рисуется, кнопка в шапке ведёт сюда, чтобы не было мёртвой
// ссылки. Адрес /map занят картой IT (app/map), поэтому /game-map.
// Когда карта будет готова, этот файл заменит сама карта.
import type { Metadata } from "next";
import { T } from "@/components/t";

export const metadata: Metadata = {
  title: "Карта A1 — скоро | A1 Jobs",
  description: "Игровая карта компаний и людей A1: Украина, здания по размеру компании, коты-путники. Скоро.",
  robots: { index: false },
};

export default function GameMapPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/game-map/cover.webp"
        alt=""
        width={1200}
        height={916}
        className="w-full rounded-3xl shadow-xl ring-1 ring-black/10 dark:ring-white/10"
      />
      <h1 className="text-3xl font-semibold">
        <T
          uk="Карта A1 — скоро"
          en="The A1 map — coming soon"
          ru="Карта A1 — скоро"
          de="Die A1-Karte — bald"
          es="El mapa de A1 — pronto"
          fr="La carte A1 — bientôt"
          pl="Mapa A1 — wkrótce"
          ptBR="O mapa do A1 — em breve"
          zh="A1 地图——敬请期待"
        />
      </h1>
      <p className="max-w-xl text-neutral-500 dark:text-neutral-400">
        <T
          uk="Компанії та люди на одній карті: чим більша команда, тим більша будівля."
          en="Companies and people on one map: the bigger the team, the bigger the building."
          ru="Компании и люди на одной карте: чем больше команда, тем больше здание."
          de="Firmen und Menschen auf einer Karte: je größer das Team, desto größer das Gebäude."
          es="Empresas y personas en un solo mapa: cuanto mayor el equipo, mayor el edificio."
          fr="Entreprises et personnes sur une seule carte : plus l'équipe est grande, plus le bâtiment l'est."
          pl="Firmy i ludzie na jednej mapie: im większy zespół, tym większy budynek."
          ptBR="Empresas e pessoas em um só mapa: quanto maior a equipe, maior o prédio."
          zh="公司与人才在同一张地图上:团队越大,建筑越大。"
        />
      </p>
    </main>
  );
}
