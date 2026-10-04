import { Nav } from "@/components/Nav";
import { RecipeCard } from "@/components/RecipeCard";
import { DemoButtons } from "@/components/DemoButtons";
import { getHomeRecommendations } from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHomeRecommendations();

  return (
    <main className="app-shell">
      <Nav />
      <section className="hero">
        <h1>
          StuMe
          <br />
          <span>what can I make?</span>
        </h1>
        <p>
          Cheap, quick, low-effort student meals from the stuff already in your kitchen.
          Graph-powered first. LLM only if the cache runs thin.
        </p>
        <p style={{ fontSize: "0.95rem" }}>
          {data.inventoryCount} ingredients in {data.kitchenName}
          {data.usedGenerator ? ` · generated ${data.generatedCount} new recipes` : " · serving from recipe cache"}
        </p>
        <DemoButtons />
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Make now</h2>
            <p>Recipes using what you already have.</p>
          </div>
        </div>
        <div className="recipe-list">
          {data.makeNow.length === 0 ? (
            <div className="empty">Nothing solid yet. Add a few staples in My kitchen.</div>
          ) : (
            data.makeNow.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} mode="now" />
            ))
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Use this soon</h2>
            <p>Prioritising bits marked as expiring.</p>
          </div>
        </div>
        <div className="recipe-list">
          {data.useSoon.length === 0 ? (
            <div className="empty">Nothing marked as expiring right now.</div>
          ) : (
            data.useSoon.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} mode="soon" />
            ))
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Almost there</h2>
            <p>One cheap extra item away.</p>
          </div>
        </div>
        <div className="recipe-list">
          {data.almostThere.length === 0 ? (
            <div className="empty">No near-misses. Either you can make loads already, or the cupboard is too empty.</div>
          ) : (
            data.almostThere.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} mode="almost" />
            ))
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Super foods</h2>
            <p>
              Low-effort buys that unlock the most meals — or fancy up what you can already make.
            </p>
          </div>
        </div>
        <div className="buy-grid">
          {data.superFoods.length === 0 ? (
            <div className="empty">No clear super foods for this kitchen yet.</div>
          ) : (
            data.superFoods.map((buy) => (
              <div className="buy-card" key={buy.ingredientSlug}>
                <h3>{buy.ingredientName}</h3>
                <div className="meta">
                  <span className="chip">super food</span>
                  <span className="chip">{buy.costCategory.replaceAll("_", " ")}</span>
                  {buy.roles.includes("unlock") && <span>{buy.mealUnlockValue} unlocks</span>}
                  {buy.roles.includes("fancy_up") && <span>{buy.mealsFanciedUp} fancy-ups</span>}
                </div>
                <ul>
                  {[...buy.unlockedRecipeTitles, ...buy.fanciedUpRecipeTitles]
                    .slice(0, 4)
                    .map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Good next buys</h2>
            <p>Cheap ingredients that unlock the most meals from what you own.</p>
          </div>
        </div>
        <div className="buy-grid">
          {data.goodNextBuys.slice(0, 6).map((buy) => (
            <div className="buy-card" key={buy.ingredientSlug}>
              <h3>{buy.ingredientName}</h3>
              <div className="meta">
                <span className="chip">{buy.costCategory.replaceAll("_", " ")}</span>
                <span>{buy.mealUnlockValue} new meals</span>
                <span>{buy.mealsImproved} improved</span>
                {buy.mealsFanciedUp > 0 && <span>{buy.mealsFanciedUp} fancy-ups</span>}
              </div>
              <ul>
                {buy.unlockedRecipeTitles.slice(0, 4).map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>If you buy 3 things</h2>
            <p>Biggest expansion to your cooking options.</p>
          </div>
        </div>
        <div className="buy-grid">
          {data.bundleBuys.map((buy, index) => (
            <div className="buy-card" key={buy.ingredientSlug}>
              <div className="chip">#{index + 1}</div>
              <h3 style={{ marginTop: "0.55rem" }}>{buy.ingredientName}</h3>
              <p style={{ margin: "0.35rem 0", color: "rgba(215,235,228,0.75)" }}>
                Unlocks {buy.mealUnlockValue} meals · improves {buy.mealsImproved}
              </p>
              <ul>
                {buy.unlockedRecipeTitles.slice(0, 3).map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
