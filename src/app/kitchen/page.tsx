import { BottomNav } from "@/components/BottomNav";
import { DemoButtons } from "@/components/DemoButtons";
import { Nav } from "@/components/Nav";
import { KitchenClient } from "@/components/KitchenClient";
import { getKitchenView } from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const { kitchen, allIngredients } = await getKitchenView();

  return (
    <main className="app-shell app-shell-nav">
      <Nav />
      <header className="page-header">
        <div className="page-header-row">
          <h1>Kitchen</h1>
          <span className="section-count soft">{kitchen.items.length}</span>
        </div>
      </header>
      <KitchenClient items={kitchen.items} allIngredients={allIngredients} />
      <DemoButtons />
      <BottomNav />
    </main>
  );
}
