import { Nav } from "@/components/Nav";
import { KitchenClient } from "@/components/KitchenClient";
import { getKitchenView } from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const { kitchen, allIngredients } = await getKitchenView();

  return (
    <main className="app-shell">
      <Nav />
      <section className="hero">
        <h1>
          My
          <br />
          <span>kitchen</span>
        </h1>
        <p>
          Tell StuMe what you already have. Exact quantities optional. “Have mushrooms” is enough.
        </p>
      </section>
      <KitchenClient items={kitchen.items} allIngredients={allIngredients} />
    </main>
  );
}
