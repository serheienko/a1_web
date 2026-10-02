// app/game-map/data/route.ts -- JSON со всеми компаниями для карты.
// Кэш на час (как и индекс вакансий); первая сборка медленная (подробности
// сотен профилей), дальше отдаётся готовое.
import { loadCompanies } from "../load-companies";

export const revalidate = 3600;

export async function GET() {
  const companies = await loadCompanies();
  return Response.json(companies, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
