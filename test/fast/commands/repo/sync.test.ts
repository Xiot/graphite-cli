import { expect } from "chai";
import { execSync } from "child_process";
import fs from "fs-extra";
import { GitRepo } from "../../../../src/lib/utils";
import { allScenes } from "../../../lib/scenes";
import { configureTest, expectCommits } from "../../../lib/utils";

function fakeGitSquashAndMerge(
  repo: GitRepo,
  branchName: string,
  squashedCommitMessage: string
) {
  // Fake github squash and merge
  execSync(`git -C "${repo.dir}" switch -q -c temp ${branchName}`);
  repo.checkoutBranch("temp");
  execSync(`git -C "${repo.dir}" rebase main -Xtheirs`, { stdio: "ignore" });
  execSync(
    `git -C "${repo.dir}" reset --soft $(git -C "${repo.dir}" merge-base HEAD main)`
  );
  repo.checkoutBranch("main");
  execSync(`git -C "${repo.dir}" commit -m "${squashedCommitMessage}"`);
  execSync(`git -C "${repo.dir}" branch -D temp`);
}

function expectBranches(repo: GitRepo, sortedBranches: string) {
  expect(
    execSync(
      `git -C "${repo.dir}" for-each-ref refs/heads/ "--format=%(refname:short)"`
    )
      .toString()
      .trim()
      .split("\n")
      .filter((b) => b !== "prod") // scene related branch
      .filter((b) => b !== "x2") // scene related branch
      .sort()
      .join(", ")
  ).to.equal(sortedBranches);
}

for (const scene of allScenes) {
  // eslint-disable-next-line max-lines-per-function
  describe(`(${scene}): repo sync`, function () {
    configureTest(this, scene);

    it("Can delete a single merged branch", async () => {
      scene.repo.createChange("2", "a");
      scene.repo.execCliCommand(`branch create "a" -m "a" -q`);

      expectBranches(scene.repo, "a, main");

      fakeGitSquashAndMerge(scene.repo, "a", "squash");
      scene.repo.execCliCommand(`repo sync -qf --no-pull`);

      expectBranches(scene.repo, "main");
    });

    it("Can noop sync if there are no stacks", () => {
      expect(() =>
        scene.repo.execCliCommand(`repo sync -qf --no-pull`)
      ).to.not.throw(Error);
    });

    it("Can delete the foundation of a double stack", async () => {
      scene.repo.createChange("2", "a");
      scene.repo.execCliCommand(`branch create "a" -m "a" -q`);

      scene.repo.createChange("3", "b");
      scene.repo.execCliCommand(`branch create "b" -m "b" -q`);

      expectBranches(scene.repo, "a, b, main");

      fakeGitSquashAndMerge(scene.repo, "a", "squash");
      scene.repo.execCliCommand(`repo sync -qf --no-pull`);

      expectBranches(scene.repo, "b, main");
      expectCommits(scene.repo, "squash, 1");

      scene.repo.checkoutBranch("b");
      expectCommits(scene.repo, "b, squash, 1");
    });

    xit("Can delete two branches off a three-stack", async () => {
      scene.repo.createChange("2", "a");
      scene.repo.execCliCommand(`branch create "a" -m "a" -q`);

      scene.repo.createChange("3", "b");
      scene.repo.execCliCommand(`branch create "b" -m "b" -q`);

      scene.repo.createChange("4", "c");
      scene.repo.execCliCommand(`branch create "c" -m "c" -q`);

      expectBranches(scene.repo, "a, b, c, main");

      fakeGitSquashAndMerge(scene.repo, "a", "squash_a");
      fakeGitSquashAndMerge(scene.repo, "b", "squash_b");
      scene.repo.execCliCommand(`repo sync -qf --no-pull`);

      expectBranches(scene.repo, "c, main");
      expectCommits(scene.repo, "squash_b, squash_a, 1");
    });

    it("Can delete two branches, while syncing inbetween, off a three-stack", async () => {
      scene.repo.createChange("2", "a");
      scene.repo.execCliCommand(`branch create "a" -m "a" -q`);

      scene.repo.createChange("3", "b");
      scene.repo.execCliCommand(`branch create "b" -m "b" -q`);

      scene.repo.createChange("4", "c");
      scene.repo.execCliCommand(`branch create "c" -m "c" -q`);

      expectBranches(scene.repo, "a, b, c, main");

      fakeGitSquashAndMerge(scene.repo, "a", "squash_a");
      scene.repo.execCliCommand(`repo sync -qf --no-pull`);
      fakeGitSquashAndMerge(scene.repo, "b", "squash_b");
      scene.repo.execCliCommand(`repo sync -qf --no-pull`);

      expectBranches(scene.repo, "c, main");
      expectCommits(scene.repo, "squash_b, squash_a, 1");

      const metadata = fs.readdirSync(
        `${scene.repo.dir}/.git/refs/branch-metadata`
      );
      expect(metadata.includes("a")).to.be.false;
      expect(metadata.includes("b")).to.be.false;
      expect(metadata.includes("c")).to.be.true;
    });

    it("Deletes dangling metadata refs", async () => {
      scene.repo.createChange("a", "a");
      scene.repo.execCliCommand(`branch create "a" -m "a" -q`);

      scene.repo.createChange("b", "b");
      scene.repo.execCliCommand(`branch create "b" -m "b" -q`);

      scene.repo.checkoutBranch("main");
      execSync(`git -C "${scene.repo.dir}" branch -D a`);

      let metadata = fs.readdirSync(
        `${scene.repo.dir}/.git/refs/branch-metadata`
      );
      expect(metadata.includes("a")).to.be.true;
      expect(metadata.includes("b")).to.be.true;
      scene.repo.execCliCommand(`repo sync -q --no-pull -f`);

      metadata = fs.readdirSync(`${scene.repo.dir}/.git/refs/branch-metadata`);
      expect(metadata.includes("a")).to.be.false;
      expect(metadata.includes("b")).to.be.true;
    });

    xit("Can detect dead branches off multiple stacks", async () => {
      scene.repo.createChange("a", "a");
      scene.repo.execCliCommand(`branch create "a" -m "a" -q`);

      scene.repo.createChange("b", "b");
      scene.repo.execCliCommand(`branch create "b" -m "b" -q`);

      scene.repo.createChange("c", "c");
      scene.repo.execCliCommand(`branch create "c" -m "c" -q`);

      expectBranches(scene.repo, "a, b, c, main");

      scene.repo.checkoutBranch("main");

      scene.repo.createChange("d", "d");
      scene.repo.execCliCommand(`branch create "d" -m "d" -q`);

      scene.repo.createChange("e", "e");
      scene.repo.execCliCommand(`branch create "e" -m "e" -q`);

      fakeGitSquashAndMerge(scene.repo, "a", "squash_a");
      fakeGitSquashAndMerge(scene.repo, "b", "squash_b");
      fakeGitSquashAndMerge(scene.repo, "d", "squash_d");

      scene.repo.execCliCommand(`repo sync -qf --no-pull`);

      expectBranches(scene.repo, "c, e, main");
      scene.repo.checkoutBranch("main");
      expectCommits(scene.repo, "squash_d, squash_b, squash_a");
      scene.repo.checkoutBranch("c");
      expectCommits(scene.repo, "c, squash_d, squash_b, squash_a");
      scene.repo.checkoutBranch("e");
      expectCommits(scene.repo, "e, squash_d, squash_b, squash_a");
    });
  });
}