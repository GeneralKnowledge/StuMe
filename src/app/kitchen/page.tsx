import { BottomNav } from "@/components/BottomNav";
import { DemoButtons } from "@/components/DemoButtons";
import { Nav } from "@/components/Nav";
import { KitchenClient } from "@/components/KitchenClient";
import { getKitchenView } from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const { kitchen, allIngredients, popularIngredients, assumedStaples } =
    await getKitchenView();

  return (
    <main className="app-shell app-shell-nav">
      <Nav />
      <header className="page-header">
        <div className="page-header-row">
          <h1>Kitchen</h1>
          <span className="section-count soft">
            {
              kitchen.items.filter(
                (item) => !assumedStaples.some((staple) => staple.slug === item.slug),
              ).length
            }
          </span>
        </div>
        <p className="page-header-meta page-header-meta-left">
          Tap to add. Mark Use soon when something needs eating.
        </p>
      </header>
      <KitchenClient
        items={kitchen.items}
        allIngredients={allIngredients}
        popularIngredients={popularIngredients}
        assumedStaples={assumedStaples}
        equipment={kitchen.equipment}
      />
      <DemoButtons />
      <BottomNav />
    </main>
  );
}
