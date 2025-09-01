export function AboutPage() {
  return (
    <div className="max-w-3xl p-8 m-4 bg-white rounded-lg">
      <h1 className="mb-4 text-3xl font-bold">About XR Formant</h1>
      <p className="mb-4">
        This immersive XR tool invites spatial practitioners to explore how
        built environments are perceived through different physical and sensory
        conditions. By experiencing architectural spaces through diverse
        embodied perspectives, designers can question assumptions, assess
        accessibility, and deepen understanding of how design decisions shape
        user experiences across a spectrum of bodies.
      </p>

      <p className="mb-4">
        Developed as part of the{" "}
        <a
          href="https://designplusplus.ethz.eth/education/summer-school/summerschool2025.html"
          className="text-blue-600 underline hover:text-blue-800"
          target="_blank"
          rel="noopener noreferrer"
        >
          ETH Zurich Design++ Summer School 2025{" "}
        </a>{" "}
        - exploring how to design space through other bodies and embodied
        perspectives.
      </p>
    </div>
  );
}
