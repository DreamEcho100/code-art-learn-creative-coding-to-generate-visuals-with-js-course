import { A, useLocation } from "@solidjs/router";
import { For } from "solid-js";

export default function Nav() {
  const location = useLocation();
  const active = (path: string) =>
    path === location.pathname
      ? "border-sky-600"
      : "border-transparent hover:border-sky-600";

  const navItems = [
    {
      href: "/",
      title: "Home",
    },
    {
      href: "/about",
      title: "About",
    },
    {
      href: "/particles",
      title: "Particles",
    },
    {
      href: "/pixel-effect-for-images",
      title: "Pixel Effect for Images",
    },
  ];

  return (
    <nav class="bg-sky-800">
      <ul class="container flex items-center p-3 text-gray-200 gap-1.5 sm:gap-6">
        <For each={navItems}>
          {(item) => (
            <li>
              <A
                href={item.href}
                rel="noopener"
                class={`border-b-2 ${active(item.href)}`}
              >
                {item.title}
              </A>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
