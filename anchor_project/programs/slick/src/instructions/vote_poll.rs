use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Vote on a poll
/// 
/// Validation:
/// - Voter must be a member of the community
/// - Voter can only vote once per poll
/// - Option index must be valid
/// - Poll must not have ended
/// 
/// Events: PollVoted
#[derive(Accounts)]
pub struct VotePoll<'info> {
    #[account(mut)]
    pub poll: Account<'info, PollAccount>,
    
    #[account(
        seeds = [MEMBERSHIP_SEED, poll.community.as_ref(), voter.key().as_ref()],
        bump
    )]
    pub membership: Account<'info, MembershipAccount>,
    
    #[account(
        init,
        payer = voter,
        space = VOTE_SIZE,
        seeds = [VOTE_SEED, poll.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote: Account<'info, VoteAccount>,
    
    #[account(mut)]
    pub voter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn vote_poll(ctx: Context<VotePoll>, option_index: u8) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    let vote = &mut ctx.accounts.vote;
    let clock = Clock::get()?;
    
    // Check poll has not ended
    require!(
        clock.unix_timestamp < poll.end_time,
        SocialError::PollEnded
    );
    
    // Validate option index
    require!(
        (option_index as usize) < poll.option_profiles.len(),
        SocialError::InvalidPollOption
    );
    
    // Record the vote
    vote.poll = poll.key();
    vote.voter = ctx.accounts.voter.key();
    vote.option_index = option_index;
    vote.voted_at = clock.unix_timestamp;
    
    // Increment vote count for the selected option
    let current_votes = poll.votes_per_option[option_index as usize];
    poll.votes_per_option[option_index as usize] = current_votes
        .checked_add(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(PollVoted {
        poll: poll.key(),
        voter: ctx.accounts.voter.key(),
        option_index,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
