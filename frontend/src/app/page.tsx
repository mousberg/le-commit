import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Image
        src="/logo.svg"
        alt="le-commit"
        width={120}
        height={120}
        className="mb-8"
      />
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        le-commit
      </h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-400">
        Ready to build
      </p>
    </div>
  );
}