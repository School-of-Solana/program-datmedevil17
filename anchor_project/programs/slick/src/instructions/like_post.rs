use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Like a post
/// 
/// Validation:
/// - User cannot like their own post
/// - User cannot like the same post twice
/// - User must be a member of the community
/// 
/// Events: PostLiked
#[derive(Accounts)]
pub struct LikePost<'info> {
    #[account(mut)]
    pub post: Account<'info, PostAccount>,
    
    #[account(
        seeds = [MEMBERSHIP_SEED, post.community.as_ref(), liker.key().as_ref()],
        bump
    )]
    pub membership: Account<'info, MembershipAccount>,
    
    #[account(
        init,
        payer = liker,
        space = LIKE_SIZE,
        seeds = [LIKE_SEED, post.key().as_ref(), liker.key().as_ref()],
        bump
    )]
    pub like: Account<'info, LikeAccount>,
    
    #[account(mut)]
    pub liker: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn like_post(ctx: Context<LikePost>) -> Result<()> {
    let post = &mut ctx.accounts.post;
    let like = &mut ctx.accounts.like;
    let clock = Clock::get()?;
    
    // Check not liking own post (if post is not anonymous)
    if let Some(author) = post.author {
        require!(
            author != ctx.accounts.liker.key(),
            SocialError::CannotLikeOwnPost
        );
    }
    
    like.post = post.key();
    like.liker = ctx.accounts.liker.key();
    like.liked_at = clock.unix_timestamp;
    
    // Increment like count
    post.likes_count = post.likes_count
        .checked_add(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(PostLiked {
        post: post.key(),
        liker: ctx.accounts.liker.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
