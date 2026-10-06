import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Nav } from "@/components/Nav";
import { RecipeCard } from "@/components/RecipeCard";
import { DemoButtons } from "@/components/DemoButtons";
import { getHomeRecommendations } from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHomeRecommendations();
  const makeNow = data.makeNow ?? [];
  const almostThere = data.almostThere ?? [];
  const useSoon = data.useSoon ?? [];
  const superFoods = data.superFoods ?? [];
  const goodNextBuys = data.goodNextBuys ?? [];
  const bundleBuys = data.bundleBuys ?? [];
  const makeNowPreview = makeNow.slice(0, 6);
  const almostPreview = almostThere.slice(0, 4);
  const soonPreview = useSoon.slice(0, 3);

  return (
    <main className="app-shell app-shell-nav">
      <Nav />
      <header className="page-header">
        <div className="page-header-row">
          <h1>What can I make?</h1>
          <p className="page-header-meta">
            {data.inventoryCount} in {data.kitchenName}
          </p>
        </div>
        <DemoButtons />
      </header>

      <section className="section section-primary">
        <div className="section-head">
          <h2>Make now</h2>
          {makeNow.length > 0 && <span className="section-count">{makeNow.length}</span>}
        </div>
        <div className="recipe-list">
          {makeNowPreview.length === 0 ? (
            <div className="empty">
              Nothing solid yet.{" "}
              <Link href="/kitchen" className="text-link">
                Add a few staples
              </Link>
              .
            </div>
          ) : (
            makeNowPreview.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} mode="now" />
            ))
          )}
        </div>
      </section>

      {soonPreview.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Use this soon</h2>
          </div>
          <div className="recipe-list">
            {soonPreview.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} mode="soon" />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Almost there</h2>
        </div>
        <div className="recipe-list">
          {almostPreview.length === 0 ? (
            <div className="empty">No near-misses right now.</div>
          ) : (
            almostPreview.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} mode="almost" />
            ))
          )}
        </div>
      </section>

      <section className="section section-shop">
        <div className="section-head">
          <h2>Smart buys</h2>
        </div>

        {superFoods.length > 0 && (
          <>
            <h3 className="subsection-label">Super foods</h3>
            <div className="buy-rail">
              {superFoods.map((buy) => (
                <div className="buy-card" key={buy.ingredientSlug}>
                  <h3>{buy.ingredientName}</h3>
                  <div className="meta">
                    <span className="chip">super</span>
                    <span className="chip">{buy.costCategory.replaceAll("_", " ")}</span>
                  </div>
                  <p className="buy-stat">
                    {buy.roles.includes("unlock") && `${buy.mealUnlockValue} unlocks`}
                    {buy.roles.includes("unlock") && buy.roles.includes("fancy_up") && " · "}
                    {buy.roles.includes("fancy_up") && `${buy.mealsFanciedUp} fancy-ups`}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        <h3 className="subsection-label">Next buys</h3>
        <div className="buy-rail">
          {goodNextBuys.slice(0, 6).map((buy) => (
            <div className="buy-card" key={buy.ingredientSlug}>
              <h3>{buy.ingredientName}</h3>
              <div className="meta">
                <span className="chip">{buy.costCategory.replaceAll("_", " ")}</span>
                <span>{buy.mealUnlockValue} meals</span>
              </div>
              <ul>
                {buy.unlockedRecipeTitles.slice(0, 2).map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {bundleBuys.length > 0 && (
          <>
            <h3 className="subsection-label">If you buy 3</h3>
            <div className="bundle-row">
              {bundleBuys.map((buy, index) => (
                <div className="bundle-chip" key={buy.ingredientSlug}>
                  <span className="bundle-num">{index + 1}</span>
                  <span>{buy.ingredientName}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
