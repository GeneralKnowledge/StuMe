import { BottomNav } from "@/components/BottomNav";
import { Nav } from "@/components/Nav";
import { KitchenClient } from "@/components/KitchenClient";
import { getKitchenView } from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const { kitchen, allIngredients } = await getKitchenView();

  return (
    <main className="app-shell app-shell-nav">
      <Nav />
      <section className="hero hero-kitchen">
        <h1>
          My
          <br />
          <span>kitchen</span>
        </h1>
        <p>Tap what you have. Exact quantities optional.</p>
      </section>
      <KitchenClient items={kitchen.items} allIngredients={allIngredients} />
      <BottomNav />
    </main>
  );
}
