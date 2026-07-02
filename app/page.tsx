import { copy } from "@/lib/copy";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{copy.site.title}</h1>
      <p className="mt-4">{copy.home.building}</p>
    </main>
  );
}
