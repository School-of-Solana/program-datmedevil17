import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionSignature,
} from "@solana/web3.js";
import { SocialProgram } from "./social_program";
import idl from "./social_program.json";
import { getClusterURL } from "@/utils/helper";

const CLUSTER: string = process.env.NEXT_PUBLIC_CLUSTER || "devnet";
const RPC_URL: string = getClusterURL(CLUSTER);

const getProvider = (
  publicKey: PublicKey | null,
  signTransaction: unknown,
  sendTransaction: unknown
): Program<SocialProgram> | null => {
  if (!publicKey || !signTransaction) {
    console.log("Wallet not connected or missing signTransaction");
    return null;
  }

  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(
    connection,
    { publicKey, signTransaction, sendTransaction } as unknown as Wallet,
    { commitment: "processed" }
  );

  return new Program<SocialProgram>(idl as SocialProgram, provider);
};

const getProviderReadonly = (): Program<SocialProgram> => {
  const connection = new Connection(RPC_URL, "confirmed");

  const walllet = {
    publicKey: PublicKey.default,
    signTransaction: async () => {
      throw new Error("Read-only provider cannot sign transactions.");
    },
    signAllTransaction: async () => {
      throw new Error("Read-only provider cannot sign transactions.");
    },
  };

  const provider = new AnchorProvider(
    connection,
    walllet as unknown as Wallet,
    { commitment: "processed" }
  );

  return new Program<SocialProgram>(idl as SocialProgram, provider);
};

// ============================================================================
// Profile Functions
// ============================================================================

const createProfile = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  displayName: string,
  avatarUri: string
): Promise<TransactionSignature> => {
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .createProfile(displayName, avatarUri)
    .accountsPartial({
      profile: profilePda,
      owner: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

const updateProfile = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  displayName?: string,
  avatarUri?: string
): Promise<TransactionSignature> => {
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .updateProfile(displayName || null, avatarUri || null)
    .accountsPartial({
      profile: profilePda,
      owner: publicKey,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

// ============================================================================
// Community Functions
// ============================================================================

const createCommunity = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  name: string,
  descriptionUri: string,
  communityId: number
): Promise<TransactionSignature> => {
  const [communityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("community"), new BN(communityId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [creatorProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), publicKey.toBuffer()],
    program.programId
  );

  const [membershipPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), communityPda.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .createCommunity(name, descriptionUri, new BN(communityId))
    .accountsPartial({
      community: communityPda,
      creatorProfile: creatorProfilePda,
      membership: membershipPda,
      creator: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

const joinCommunity = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  communityPublicKey: PublicKey
): Promise<TransactionSignature> => {
  const [userProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), publicKey.toBuffer()],
    program.programId
  );

  const [membershipPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), communityPublicKey.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .joinCommunity()
    .accountsPartial({
      community: communityPublicKey,
      userProfile: userProfilePda,
      membership: membershipPda,
      user: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

const leaveCommunity = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  communityPublicKey: PublicKey
): Promise<TransactionSignature> => {
  const [membershipPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), communityPublicKey.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .leaveCommunity()
    .accountsPartial({
      community: communityPublicKey,
      membership: membershipPda,
      user: publicKey,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

// ============================================================================
// Post Functions
// ============================================================================

const createPost = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  communityPublicKey: PublicKey,
  contentUri: string,
  contentHash: number[],
  isAnonymous: boolean,
  pseudonym?: string
): Promise<TransactionSignature> => {
  const [membershipPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), communityPublicKey.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  // Get current post count to generate post PDA
  const community = await program.account.communityAccount.fetch(communityPublicKey);
  const postId = community.postCounter;

  const [postPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("post"),
      communityPublicKey.toBuffer(),
      postId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  const contentHashArray = new Uint8Array(contentHash);

  const tx = await program.methods
    .createPost(contentUri, Array.from(contentHashArray), isAnonymous, pseudonym || null)
    .accountsPartial({
      community: communityPublicKey,
      membership: membershipPda,
      post: postPda,
      author: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

const likePost = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  postPublicKey: PublicKey
): Promise<TransactionSignature> => {
  // Fetch post to get community
  const post = await program.account.postAccount.fetch(postPublicKey);

  const [membershipPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), post.community.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  const [likePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("like"), postPublicKey.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .likePost()
    .accountsPartial({
      post: postPublicKey,
      membership: membershipPda,
      like: likePda,
      liker: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

const unlikePost = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  postPublicKey: PublicKey
): Promise<TransactionSignature> => {
  const [likePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("like"), postPublicKey.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .unlikePost()
    .accountsPartial({
      post: postPublicKey,
      like: likePda,
      liker: publicKey,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

const tipPost = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  postPublicKey: PublicKey,
  recipientPublicKey: PublicKey,
  amount: number
): Promise<TransactionSignature> => {
  const tx = await program.methods
    .tipPost(new BN(amount))
    .accountsPartial({
      post: postPublicKey,
      recipient: recipientPublicKey,
      tipper: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

// ============================================================================
// Comment Functions
// ============================================================================

const commentOnPost = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  postPublicKey: PublicKey,
  contentUri: string,
  contentHash: number[]
): Promise<TransactionSignature> => {
  // Fetch post to get community and comment count
  const post = await program.account.postAccount.fetch(postPublicKey);

  const [membershipPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), post.community.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  const commentId = post.commentsCount;

  const [commentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("comment"),
      postPublicKey.toBuffer(),
      commentId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  const contentHashArray = new Uint8Array(contentHash);

  const tx = await program.methods
    .commentOnPost(contentUri, Array.from(contentHashArray))
    .accountsPartial({
      post: postPublicKey,
      membership: membershipPda,
      comment: commentPda,
      commenter: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

// ============================================================================
// Follow Functions
// ============================================================================

const followUser = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  targetUserPublicKey: PublicKey
): Promise<TransactionSignature> => {
  const [followerProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), publicKey.toBuffer()],
    program.programId
  );

  const [followedProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), targetUserPublicKey.toBuffer()],
    program.programId
  );

  const [followPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("follow"), followerProfilePda.toBuffer(), followedProfilePda.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .followUser()
    .accountsPartial({
      followerProfile: followerProfilePda,
      followedProfile: followedProfilePda,
      follow: followPda,
      owner: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

const unfollowUser = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  targetUserPublicKey: PublicKey
): Promise<TransactionSignature> => {
  const [followerProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), publicKey.toBuffer()],
    program.programId
  );

  const [followedProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), targetUserPublicKey.toBuffer()],
    program.programId
  );

  const [followPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("follow"), followerProfilePda.toBuffer(), followedProfilePda.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .unfollowUser()
    .accountsPartial({
      followerProfile: followerProfilePda,
      followedProfile: followedProfilePda,
      follow: followPda,
      owner: publicKey,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

// ============================================================================
// Poll Functions
// ============================================================================

const createPoll = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  communityPublicKey: PublicKey,
  questionUri: string,
  optionProfiles: PublicKey[],
  endTime: number
): Promise<TransactionSignature> => {
  const [membershipPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), communityPublicKey.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  // Get current poll count to generate poll PDA
  const community = await program.account.communityAccount.fetch(communityPublicKey);
  const pollId = community.pollCounter;

  const [pollPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("poll"),
      communityPublicKey.toBuffer(),
      pollId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  const tx = await program.methods
    .createPoll(questionUri, optionProfiles, new BN(endTime))
    .accountsPartial({
      community: communityPublicKey,
      membership: membershipPda,
      poll: pollPda,
      creator: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

const votePoll = async (
  program: Program<SocialProgram>,
  publicKey: PublicKey,
  pollPublicKey: PublicKey,
  optionIndex: number
): Promise<TransactionSignature> => {
  // Fetch poll to get community
  const poll = await program.account.pollAccount.fetch(pollPublicKey);

  const [membershipPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), poll.community.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  const [votePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), pollPublicKey.toBuffer(), publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .votePoll(optionIndex)
    .accountsPartial({
      poll: pollPublicKey,
      membership: membershipPda,
      vote: votePda,
      voter: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const connection = new Connection(
    program.provider.connection.rpcEndpoint,
    "confirmed"
  );

  await connection.confirmTransaction(tx, "finalized");
  return tx;
};

// ============================================================================
// Fetch Functions
// ============================================================================

const fetchProfile = async (
  program: Program<SocialProgram>,
  userPublicKey: PublicKey
) => {
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), userPublicKey.toBuffer()],
    program.programId
  );

  try {
    return await program.account.profileAccount.fetch(profilePda);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

const fetchCommunity = async (
  program: Program<SocialProgram>,
  communityPublicKey: PublicKey
) => {
  try {
    return await program.account.communityAccount.fetch(communityPublicKey);
  } catch (error) {
    console.error("Error fetching community:", error);
    return null;
  }
};

const fetchAllCommunities = async (program: Program<SocialProgram>) => {
  try {
    return await program.account.communityAccount.all();
  } catch (error) {
    console.error("Error fetching all communities:", error);
    return [];
  }
};

const fetchPost = async (
  program: Program<SocialProgram>,
  postPublicKey: PublicKey
) => {
  try {
    return await program.account.postAccount.fetch(postPublicKey);
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
};

const fetchAllPosts = async (program: Program<SocialProgram>) => {
  try {
    return await program.account.postAccount.all();
  } catch (error) {
    console.error("Error fetching all posts:", error);
    return [];
  }
};

const fetchCommunityPosts = async (
  program: Program<SocialProgram>,
  communityPublicKey: PublicKey
) => {
  try {
    const allPosts = await program.account.postAccount.all();
    return allPosts.filter((post) =>
      post.account.community.equals(communityPublicKey)
    );
  } catch (error) {
    console.error("Error fetching community posts:", error);
    return [];
  }
};

const fetchPostComments = async (
  program: Program<SocialProgram>,
  postPublicKey: PublicKey
) => {
  try {
    const allComments = await program.account.commentAccount.all();
    return allComments.filter((comment) =>
      comment.account.post.equals(postPublicKey)
    );
  } catch (error) {
    console.error("Error fetching post comments:", error);
    return [];
  }
};

const fetchPoll = async (
  program: Program<SocialProgram>,
  pollPublicKey: PublicKey
) => {
  try {
    return await program.account.pollAccount.fetch(pollPublicKey);
  } catch (error) {
    console.error("Error fetching poll:", error);
    return null;
  }
};

const fetchCommunityPolls = async (
  program: Program<SocialProgram>,
  communityPublicKey: PublicKey
) => {
  try {
    const allPolls = await program.account.pollAccount.all();
    return allPolls.filter((poll) =>
      poll.account.community.equals(communityPublicKey)
    );
  } catch (error) {
    console.error("Error fetching community polls:", error);
    return [];
  }
};

const fetchAllPolls = async (
  program: Program<SocialProgram>
) => {
  try {
    const allPolls = await program.account.pollAccount.all();
    return allPolls;
  } catch (error) {
    console.error("Error fetching all polls:", error);
    return [];
  }
};

const fetchUserFollowers = async (
  program: Program<SocialProgram>,
  userPublicKey: PublicKey
) => {
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), userPublicKey.toBuffer()],
    program.programId
  );

  try {
    const allFollows = await program.account.followAccount.all();
    return allFollows.filter((follow) =>
      follow.account.followed.equals(profilePda)
    );
  } catch (error) {
    console.error("Error fetching user followers:", error);
    return [];
  }
};

const fetchUserFollowing = async (
  program: Program<SocialProgram>,
  userPublicKey: PublicKey
) => {
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), userPublicKey.toBuffer()],
    program.programId
  );

  try {
    const allFollows = await program.account.followAccount.all();
    return allFollows.filter((follow) =>
      follow.account.follower.equals(profilePda)
    );
  } catch (error) {
    console.error("Error fetching user following:", error);
    return [];
  }
};

const checkIfLiked = async (
  program: Program<SocialProgram>,
  userPublicKey: PublicKey,
  postPublicKey: PublicKey
): Promise<boolean> => {
  const [likePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("like"), postPublicKey.toBuffer(), userPublicKey.toBuffer()],
    program.programId
  );

  try {
    await program.account.likeAccount.fetch(likePda);
    return true;
  } catch {
    return false;
  }
};

const checkIfFollowing = async (
  program: Program<SocialProgram>,
  followerPublicKey: PublicKey,
  followedPublicKey: PublicKey
): Promise<boolean> => {
  const [followerProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), followerPublicKey.toBuffer()],
    program.programId
  );

  const [followedProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), followedPublicKey.toBuffer()],
    program.programId
  );

  const [followPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("follow"), followerProfilePda.toBuffer(), followedProfilePda.toBuffer()],
    program.programId
  );

  try {
    await program.account.followAccount.fetch(followPda);
    return true;
  } catch {
    return false;
  }
};

const checkIfMember = async (
  program: Program<SocialProgram>,
  userPublicKey: PublicKey,
  communityPublicKey: PublicKey
): Promise<boolean> => {
  const [membershipPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), communityPublicKey.toBuffer(), userPublicKey.toBuffer()],
    program.programId
  );

  try {
    await program.account.membershipAccount.fetch(membershipPda);
    return true;
  } catch {
    return false;
  }
};

const fetchUserMemberships = async (
  program: Program<SocialProgram>,
  userPublicKey: PublicKey
) => {
  try {
    const allMemberships = await program.account.membershipAccount.all();
    return allMemberships.filter((membership) =>
      membership.account.user.equals(userPublicKey)
    );
  } catch (error) {
    console.error("Error fetching user memberships:", error);
    return [];
  }
};

const fetchCommunityMembers = async (
  program: Program<SocialProgram>,
  communityPublicKey: PublicKey
) => {
  try {
    const allMemberships = await program.account.membershipAccount.all();
    return allMemberships.filter((membership) =>
      membership.account.community.equals(communityPublicKey)
    );
  } catch (error) {
    console.error("Error fetching community members:", error);
    return [];
  }
};

// Export all functions
export {
  getProvider,
  getProviderReadonly,
  
  // Profile Functions
  createProfile,
  updateProfile,
  
  // Community Functions
  createCommunity,
  joinCommunity,
  leaveCommunity,
  
  // Post Functions
  createPost,
  likePost,
  unlikePost,
  tipPost,
  
  // Comment Functions
  commentOnPost,
  
  // Follow Functions
  followUser,
  unfollowUser,
  
  // Poll Functions
  createPoll,
  votePoll,
  
  // Fetch Functions
  fetchProfile,
  fetchCommunity,
  fetchAllCommunities,
  fetchPost,
  fetchAllPosts,
  fetchCommunityPosts,
  fetchPostComments,
  fetchPoll,
  fetchCommunityPolls,
  fetchAllPolls,
  fetchUserFollowers,
  fetchUserFollowing,
  
  // Check Functions
  checkIfLiked,
  checkIfFollowing,
  checkIfMember,
  
  // Membership Functions
  fetchUserMemberships,
  fetchCommunityMembers,
};