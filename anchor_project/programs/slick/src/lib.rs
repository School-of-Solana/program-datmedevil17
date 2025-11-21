use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
declare_id!("54KY3Gg1zcRzvHH64tfoBM3T1mDaahaXUEWv9GCkGoye");

#[program]
pub mod social_program {
    use super::*;

    // ============= PROFILE INSTRUCTIONS =============
    pub fn create_profile(
        ctx: Context<CreateProfile>,
        display_name: String,
        avatar_uri: String,
    ) -> Result<()> {
        instructions::create_profile(ctx, display_name, avatar_uri)
    }

    pub fn update_profile(
        ctx: Context<UpdateProfile>,
        display_name: Option<String>,
        avatar_uri: Option<String>,
    ) -> Result<()> {
        instructions::update_profile(ctx, display_name, avatar_uri)
    }

    pub fn follow_user(ctx: Context<FollowUser>) -> Result<()> {
        instructions::follow_user(ctx)
    }

    pub fn unfollow_user(ctx: Context<UnfollowUser>) -> Result<()> {
        instructions::unfollow_user(ctx)
    }

    // ============= COMMUNITY INSTRUCTIONS =============
    pub fn create_community(
        ctx: Context<CreateCommunity>,
        name: String,
        description_uri: String,
        community_id: u64,
    ) -> Result<()> {
        instructions::create_community(ctx, name, description_uri, community_id)
    }

    pub fn join_community(ctx: Context<JoinCommunity>) -> Result<()> {
        instructions::join_community(ctx)
    }

    pub fn leave_community(ctx: Context<LeaveCommunity>) -> Result<()> {
        instructions::leave_community(ctx)
    }

    // ============= POST INSTRUCTIONS =============
    pub fn create_post(
        ctx: Context<CreatePost>,
        content_uri: String,
        content_hash: [u8; 32],
        is_anonymous: bool,
        pseudonym: Option<String>,
    ) -> Result<()> {
        instructions::create_post(ctx, content_uri, content_hash, is_anonymous, pseudonym)
    }

    pub fn like_post(ctx: Context<LikePost>) -> Result<()> {
        instructions::like_post(ctx)
    }

    pub fn unlike_post(ctx: Context<UnlikePost>) -> Result<()> {
        instructions::unlike_post(ctx)
    }

    pub fn comment_on_post(
        ctx: Context<CommentOnPost>,
        content_uri: String,
        content_hash: [u8; 32],
    ) -> Result<()> {
        instructions::comment_on_post(ctx, content_uri, content_hash)
    }

    pub fn tip_post(ctx: Context<TipPost>, amount: u64) -> Result<()> {
        instructions::tip_post(ctx, amount)
    }

    // ============= POLL INSTRUCTIONS =============
    pub fn create_poll(
        ctx: Context<CreatePoll>,
        question_uri: String,
        option_profiles: Vec<Pubkey>,
        end_time: i64,
    ) -> Result<()> {
        instructions::create_poll(ctx, question_uri, option_profiles, end_time)
    }

    pub fn vote_poll(ctx: Context<VotePoll>, option_index: u8) -> Result<()> {
        instructions::vote_poll(ctx, option_index)
    }
}