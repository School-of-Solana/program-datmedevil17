import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { SocialProgram } from "../target/types/social_program";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("social_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SocialProgram as Program<SocialProgram>;
  
  // Test users
  let user1: Keypair;
  let user2: Keypair;
  let user3: Keypair;
  
  // PDAs
  let user1Profile: PublicKey;
  let user2Profile: PublicKey;
  let user3Profile: PublicKey;
  let community: PublicKey;
  let membership1: PublicKey;
  let membership2: PublicKey;
  let post: PublicKey;
  let like: PublicKey;
  let comment: PublicKey;
  let follow: PublicKey;
  let poll: PublicKey;
  let vote: PublicKey;

  const communityId = new BN(1);
  const contentHash = Array(32).fill(1);

  before(async () => {
    // Create test users and airdrop SOL
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    user3 = Keypair.generate();

    await airdrop(provider.connection, user1.publicKey, 10);
    await airdrop(provider.connection, user2.publicKey, 10);
    await airdrop(provider.connection, user3.publicKey, 10);
  });

  describe("Profile Management", () => {
    it("Creates a user profile", async () => {
      [user1Profile] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), user1.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .createProfile("Alice", "https://example.com/alice.jpg")
        .accountsPartial({
          profile: user1Profile,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const profile = await program.account.profileAccount.fetch(user1Profile);
      
      assert.equal(profile.displayName, "Alice");
      assert.equal(profile.avatarUri, "https://example.com/alice.jpg");
      assert.equal(profile.owner.toString(), user1.publicKey.toString());
      assert.equal(profile.followerCount.toNumber(), 0);
      assert.equal(profile.followingCount.toNumber(), 0);
      assert.ok(profile.createdAt.toNumber() > 0);
    });

    it("Creates profiles for user2 and user3", async () => {
      [user2Profile] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), user2.publicKey.toBuffer()],
        program.programId
      );

      [user3Profile] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), user3.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createProfile("Bob", "https://example.com/bob.jpg")
        .accountsPartial({
          profile: user2Profile,
          owner: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      await program.methods
        .createProfile("Charlie", "https://example.com/charlie.jpg")
        .accountsPartial({
          profile: user3Profile,
          owner: user3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user3])
        .rpc();
    });

    it("Fails to create duplicate profile", async () => {
      try {
        await program.methods
          .createProfile("Alice2", "https://example.com/alice2.jpg")
          .accountsPartial({
            profile: user1Profile,
            owner: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.toString().includes("already in use"));
      }
    });

    it("Updates profile", async () => {
      await program.methods
        .updateProfile("Alice Updated", null)
        .accounts({
          profile: user1Profile,
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const profile = await program.account.profileAccount.fetch(user1Profile);
      assert.equal(profile.displayName, "Alice Updated");
    });

    it("Fails to update profile with display name too long", async () => {
      const longName = "a".repeat(51);
      try {
        await program.methods
          .updateProfile(longName, null)
          .accounts({
            profile: user1Profile,
            owner: user1.publicKey,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.toString().includes("DisplayNameTooLong"));
      }
    });
  });

  describe("Follow System", () => {
    it("User1 follows User2", async () => {
      [follow] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("follow"),
          user1Profile.toBuffer(),
          user2Profile.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .followUser()
        .accountsPartial({
          followerProfile: user1Profile,
          followedProfile: user2Profile,
          follow: follow,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const followAccount = await program.account.followAccount.fetch(follow);
      assert.equal(followAccount.follower.toString(), user1Profile.toString());
      assert.equal(followAccount.followed.toString(), user2Profile.toString());

      const user2ProfileData = await program.account.profileAccount.fetch(user2Profile);
      assert.equal(user2ProfileData.followerCount.toNumber(), 1);
    });

    it("Fails to follow self", async () => {
      const [selfFollow] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("follow"),
          user1Profile.toBuffer(),
          user1Profile.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .followUser()
          .accountsPartial({
            followerProfile: user1Profile,
            followedProfile: user1Profile,
            follow: selfFollow,
            owner: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.toString().includes("CannotFollowSelf"));
      }
    });

    it("Unfollows user", async () => {
      await program.methods
        .unfollowUser()
        .accountsPartial({
          followerProfile: user1Profile,
          followedProfile: user2Profile,
          follow: follow,
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const user2ProfileData = await program.account.profileAccount.fetch(user2Profile);
      assert.equal(user2ProfileData.followerCount.toNumber(), 0);

      // Verify follow account is closed
      const followAccount = await provider.connection.getAccountInfo(follow);
      assert.isNull(followAccount);
    });
  });

  describe("Community Management", () => {
    it("Creates a community", async () => {
      [community] = PublicKey.findProgramAddressSync(
        [Buffer.from("community"), communityId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      [membership1] = PublicKey.findProgramAddressSync(
        [Buffer.from("membership"), community.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createCommunity(
          "Test Community",
          "https://example.com/community-desc.json",
          communityId
        )
        .accountsPartial({
          community: community,
          creatorProfile: user1Profile,
          membership: membership1,
          creator: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const communityData = await program.account.communityAccount.fetch(community);
      assert.equal(communityData.name, "Test Community");
      assert.equal(communityData.creator.toString(), user1.publicKey.toString());
      assert.equal(communityData.memberCount.toNumber(), 1);
      assert.equal(communityData.postCounter.toNumber(), 0);
      assert.equal(communityData.pollCounter.toNumber(), 0);
    });

    it("User2 joins community", async () => {
      [membership2] = PublicKey.findProgramAddressSync(
        [Buffer.from("membership"), community.toBuffer(), user2.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .joinCommunity()
        .accountsPartial({
          community: community,
          userProfile: user2Profile,
          membership: membership2,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const communityData = await program.account.communityAccount.fetch(community);
      assert.equal(communityData.memberCount.toNumber(), 2);
    });

    it("User2 leaves community", async () => {
      await program.methods
        .leaveCommunity()
        .accounts({
          community: community,
          membership: membership2,
          user: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      const communityData = await program.account.communityAccount.fetch(community);
      assert.equal(communityData.memberCount.toNumber(), 1);

      // Verify membership is closed
      const membershipAccount = await provider.connection.getAccountInfo(membership2);
      assert.isNull(membershipAccount);
    });

    it("User2 rejoins community for further tests", async () => {
      await program.methods
        .joinCommunity()
        .accountsPartial({
          community: community,
          userProfile: user2Profile,
          membership: membership2,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();
    });
  });

  describe("Post Management", () => {
    it("Creates a public post", async () => {
      [post] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("post"),
          community.toBuffer(),
          new BN(0).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .createPost(
          "https://example.com/post1.json",
          contentHash,
          false,
          null
        )
        .accountsPartial({
          community: community,
          membership: membership1,
          post: post,
          author: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const postData = await program.account.postAccount.fetch(post);
      assert.equal(postData.contentUri, "https://example.com/post1.json");
      assert.equal(postData.author.toString(), user1.publicKey.toString());
      assert.equal(postData.likesCount.toNumber(), 0);
      assert.equal(postData.commentsCount.toNumber(), 0);
      assert.isFalse(postData.pseudonym !== null);
    });

    it("Creates an anonymous post", async () => {
      const [anonPost] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("post"),
          community.toBuffer(),
          new BN(1).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .createPost(
          "https://example.com/post2.json",
          contentHash,
          true,
          "AnonUser123"
        )
        .accountsPartial({
          community: community,
          membership: membership2,
          post: anonPost,
          author: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const postData = await program.account.postAccount.fetch(anonPost);
      assert.isNull(postData.author);
      assert.equal(postData.pseudonym, "AnonUser123");
    });

    it("Fails to create anonymous post without pseudonym", async () => {
      const [badPost] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("post"),
          community.toBuffer(),
          new BN(2).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .createPost(
            "https://example.com/post3.json",
            contentHash,
            true,
            null
          )
          .accountsPartial({
            community: community,
            membership: membership1,
            post: badPost,
            author: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.toString().includes("PseudonymRequired"));
      }
    });
  });

  describe("Post Interactions", () => {
    it("User2 likes User1's post", async () => {
      [like] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), post.toBuffer(), user2.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .likePost()
        .accountsPartial({
          post: post,
          membership: membership2,
          like: like,
          liker: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const postData = await program.account.postAccount.fetch(post);
      assert.equal(postData.likesCount.toNumber(), 1);

      const likeData = await program.account.likeAccount.fetch(like);
      assert.equal(likeData.post.toString(), post.toString());
      assert.equal(likeData.liker.toString(), user2.publicKey.toString());
    });

    it("Fails to like own post", async () => {
      const [ownLike] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), post.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .likePost()
          .accountsPartial({
            post: post,
            membership: membership1,
            like: ownLike,
            liker: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.toString().includes("CannotLikeOwnPost"));
      }
    });

    it("User2 unlikes the post", async () => {
      await program.methods
        .unlikePost()
        .accounts({
          post: post,
          like: like,
          liker: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      const postData = await program.account.postAccount.fetch(post);
      assert.equal(postData.likesCount.toNumber(), 0);

      const likeAccount = await provider.connection.getAccountInfo(like);
      assert.isNull(likeAccount);
    });

    it("User2 comments on post", async () => {
      [comment] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("comment"),
          post.toBuffer(),
          new BN(0).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .commentOnPost(
          "https://example.com/comment1.json",
          contentHash
        )
        .accountsPartial({
          post: post,
          membership: membership2,
          comment: comment,
          commenter: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const postData = await program.account.postAccount.fetch(post);
      assert.equal(postData.commentsCount.toNumber(), 1);

      const commentData = await program.account.commentAccount.fetch(comment);
      assert.equal(commentData.post.toString(), post.toString());
      assert.equal(commentData.commenter.toString(), user2.publicKey.toString());
      assert.equal(commentData.commentId.toNumber(), 0);
    });

    it("User2 tips the post", async () => {
      const initialBalance = await provider.connection.getBalance(user1.publicKey);
      const tipAmount = 2_000_000; // 0.002 SOL

      await program.methods
        .tipPost(new BN(tipAmount))
        .accountsPartial({
          post: post,
          recipient: user1.publicKey,
          tipper: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const finalBalance = await provider.connection.getBalance(user1.publicKey);
      assert.equal(finalBalance - initialBalance, tipAmount);

      const postData = await program.account.postAccount.fetch(post);
      assert.equal(postData.totalTipLamports.toNumber(), tipAmount);
    });

    it("Fails to tip with wrong amount", async () => {
      try {
        await program.methods
          .tipPost(new BN(1_000_000)) // Wrong amount
          .accountsPartial({
            post: post,
            recipient: user1.publicKey,
            tipper: user2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user2])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.toString().includes("InvalidTipAmount"));
      }
    });
  });

  describe("Poll System", () => {
    it("Creates a poll", async () => {
      [poll] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("poll"),
          community.toBuffer(),
          new BN(0).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const endTime = new BN(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now
      const options = [user1Profile, user2Profile, user3Profile];

      await program.methods
        .createPoll(
          "https://example.com/poll1.json",
          options,
          endTime
        )
        .accountsPartial({
          community: community,
          membership: membership1,
          poll: poll,
          creator: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const pollData = await program.account.pollAccount.fetch(poll);
      assert.equal(pollData.questionUri, "https://example.com/poll1.json");
      assert.equal(pollData.optionProfiles.length, 3);
      assert.equal(pollData.votesPerOption.length, 3);
      assert.equal(pollData.votesPerOption[0], 0);
    });

    it("User2 votes on poll", async () => {
      [vote] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), poll.toBuffer(), user2.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .votePoll(1) // Vote for option 1 (user2Profile)
        .accountsPartial({
          poll: poll,
          membership: membership2,
          vote: vote,
          voter: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const pollData = await program.account.pollAccount.fetch(poll);
      assert.equal(pollData.votesPerOption[1], 1);

      const voteData = await program.account.voteAccount.fetch(vote);
      assert.equal(voteData.poll.toString(), poll.toString());
      assert.equal(voteData.voter.toString(), user2.publicKey.toString());
      assert.equal(voteData.optionIndex, 1);
    });

    it("Fails to vote twice", async () => {
      try {
        await program.methods
          .votePoll(2)
          .accountsPartial({
            poll: poll,
            membership: membership2,
            vote: vote,
            voter: user2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user2])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.toString().includes("already in use"));
      }
    });

    it("Fails to vote with invalid option", async () => {
      const [user3Vote] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), poll.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .votePoll(10) // Invalid option
          .accountsPartial({
            poll: poll,
            membership: membership1,
            vote: user3Vote,
            voter: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.toString().includes("InvalidPollOption"));
      }
    });
  });

  describe("Edge Cases and Security", () => {
    it("Non-member cannot create post", async () => {
      const [nonMemberPost] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("post"),
          community.toBuffer(),
          new BN(10).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [fakeMembership] = PublicKey.findProgramAddressSync(
        [Buffer.from("membership"), community.toBuffer(), user3.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createPost(
            "https://example.com/post-bad.json",
            contentHash,
            false,
            null
          )
          .accountsPartial({
            community: community,
            membership: fakeMembership,
            post: nonMemberPost,
            author: user3.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user3])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        assert.ok(err.message.includes("AccountNotInitialized") || err.message.includes("AnchorError"));
      }
    });

    it("Content URI too long fails", async () => {
      const longUri = "https://example.com/" + "a".repeat(200);
      const [longPost] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("post"),
          community.toBuffer(),
          new BN(11).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .createPost(longUri, contentHash, false, null)
          .accountsPartial({
            community: community,
            membership: membership1,
            post: longPost,
            author: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        // The error could be ContentUriTooLong or a serialization error
        assert.ok(err.toString().includes("ContentUriTooLong") || err.toString().includes("Error Code"));
      }
    });
  });
});

// Helper function to airdrop SOL
async function airdrop(connection: any, address: PublicKey, amount: number) {
  const signature = await connection.requestAirdrop(
    address,
    amount * LAMPORTS_PER_SOL
  );
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  });
}