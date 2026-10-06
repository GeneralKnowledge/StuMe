import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { InventoryStrip } from "@/components/InventoryStrip";
import { Nav } from "@/components/Nav";
import { RecipeCard } from "@/components/RecipeCard";
import {
  getHomeRecommendations,
  getKitchenView,
  needsOnboarding,
} from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  const data = await getHomeRecommendations();
  const { allIngredients, popularIngredients } = await getKitchenView();
  const makeNow = data.makeNow ?? [];
  const almostThere = data.almostThere ?? [];
  const useSoon = data.useSoon ?? [];
  const goodNextBuys = data.goodNextBuys ?? [];
  const makeNowPreview = makeNow.slice(0, 8);
  const almostPreview = almostThere.slice(0, 5);
  const soonPreview = useSoon.slice(0, 3);
  const topBuy = goodNextBuys[0];

  return (
    <main className="app-shell app-shell-nav">
      <Nav />

      <InventoryStrip
        items={data.inventory}
        popular={popularIngredients}
        allIngredients={allIngredients.map((item) => ({
          id: item.id,
          slug: item.slug,
          name: item.name,
        }))}
      />

      <section className="section section-primary">
        <div className="section-head">
          <h2>Make now</h2>
          {makeNow.length > 0 && (
            <span className="section-count">{makeNow.length}</span>
          )}
        </div>
        {makeNow.length > 0 && (
          <p className="section-sub">
            You can make {makeNow.length} thing{makeNow.length === 1 ? "" : "s"} right now.
          </p>
        )}
        <div className="recipe-list">
          {makeNowPreview.length === 0 ? (
            <div className="empty">
              {data.inventoryCount === 0 ? (
                <>
                  Add 3 things you have — we&apos;ll tell you what you can eat.
                </>
              ) : data.inventoryCount < 3 ? (
                <>
                  Add one more staple (eggs or pasta usually unlocks something).
                </>
              ) : (
                <>
                  Nothing solid with this mix yet.{" "}
                  <Link href="/kitchen" className="text-link">
                    Tweak your kitchen
                  </Link>
                  .
                </>
              )}
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
          <p className="section-sub">Meals that use food you marked Use soon.</p>
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
            <div className="empty">No one-ingredient near-misses right now.</div>
          ) : (
            almostPreview.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} mode="almost" />
            ))
          )}
        </div>
      </section>

      {topBuy && topBuy.mealUnlockValue > 0 && (
        <section className="section section-quiet-buy">
          <p className="quiet-buy">
            <strong>Buy {topBuy.ingredientName.toLowerCase()}</strong>
            {" — "}
            unlocks {topBuy.mealUnlockValue} meal
            {topBuy.mealUnlockValue === 1 ? "" : "s"} from what you already have
            {topBuy.unlockedRecipeTitles[0]
              ? ` (e.g. ${topBuy.unlockedRecipeTitles[0]})`
              : ""}
            .
          </p>
        </section>
      )}

      <BottomNav />
    </main>
  );
}
